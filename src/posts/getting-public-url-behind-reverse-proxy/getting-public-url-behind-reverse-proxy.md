---
title: Getting the public URL for an ASP.NET app behind a reverse proxy
description: Detecting the public URL for ASP.NET Core app inside a hosted service
tags:
  - post
  - aspnetcore
date: 2020-11-14
$aliases:
    - posts/getting-public-url-for-an-asp-net-app-behind-reverse-proxy/
---



I'm building a small library for broadcasting URLs to a service that pings these URLs at regular intervals. 
The service works like crontab on steroids. 
It keeps a list of URLs and when those URLs should be called using cron expressions.

Each URL is handled by a handler that runs a job in the background. 
This lets me perform routine tasks without having to run a separate worker process. 
This approach has its faults, but for short & light tasks, it's more than enough.

At startup, I gather a list of cron jobs inside a `HostedService`, 
then broadcast them to crontab-service to have them pinged later. 


## Problem: reverse proxies

A problem I faced while building the URLs was to find out the public-facing URL for the web app.
I can't just get these URLs from Kestrel or any other component because my app will be listening to localhost at some port. 
App has no idea about whether there's a server proxying requests to it, such as IIS, Caddy, Nginx, etc. 
It has to wait until the first request to find out the actual URL that reaches the app.

A workaround I've implemented was to supply a URL template `https://public.url/-/cronjobs/{name}` and generate URLs with it.
But if the URL is out of my control, as in the case of a lambda function with a random URL assigned by a cloud provider, 
I would still have to get the URL.

When working inside an HTTP context, I can find out which URL is being handled using

```c#
var url = context.Request.GetDisplayUrl()
```

But a background service works outside the HTTP context, so it still cannot know about any HTTP event.

## Solution

The solution I implemented was to create a singleton to store the URL, 
and put a middleware at the beginning of the request pipeline.
When the first request arrives, I trigger an event, and the worker waiting for this event continues execution.

The singleton service is a wrapper around [`ManualResetEventSlim`][manuelresetevent].

```c#
public class PublicUrlRegistry
{
    private static readonly Lazy<ManualResetEventSlim> @event = new Lazy<ManualResetEventSlim>();
    private static Uri _url;

    public void Set(Uri url)
    {
        _url = url;
        @event.Value.Set();
    }

    public bool IsSet => @event.Value.IsSet;

    public Uri WaitForUrl(CancellationToken cancellationToken)
    {
        @event.Value.Wait(cancellationToken);
        return _url;
    }
}
```

The middleware retrieves and stores the URL of the request.

```c#

internal static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UsePublicUrlDetector(this IApplicationBuilder app)
    {
        return app.Use((context, next) =>
        {
            var registry = context.RequestServices.GetRequiredService<PublicUrlRegistry>();
            if (registry.IsSet)
            {
                return next();
            }
            registry.Set(new Uri(context.Request.GetDisplayUrl()));
            return next();
        });
    }
}
```

Background service waits until the URL is set, then continues execution.


```c#
public class BackgroundWorker : BackgroundService
{
    private readonly ILogger<BackgroundWorker> _logger;
    private readonly PublicUrlRegistry _registry;

    public BackgroundWorker(ILogger<BackgroundWorker> logger, PublicUrlRegistry registry)
    {
        _logger = logger;
        _registry = registry;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Waiting for the first request");
        try
        {
            // this line is blocking execution until event is set
            var url = _registry.WaitForUrl(stoppingToken);
            _logger.LogInformation("Got {url}", url.GetLeftPart(UriPartial.Authority));
        }
        catch (OperationCanceledException)
        {
            // App is stopping
        }
        
        return Task.CompletedTask;
    }
}
```

and configured in `Startup` class. We need to register service as singleton, 
and put middleware at the beginning of the request pipeline. 
Otherwise, other middlewares could short circuit and requests may never reach our middleware. 

```c#
public class Startup
{
    // ...
    
    public void ConfigureServices(IServiceCollection services)
    {
        // not registering hosted service here! read on.
        services.AddSingleton<PublicUrlRegistry>();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // middleware comes first!
        app.UsePublicUrlDetector();
        
        app.UseRouting();
        app.UseEndpoints(endpoints => { endpoints.MapGet("/", context => context.Response.WriteAsync("hello")); });
    }
}
```


## Deadlock

So was the plan.
But after running the app I realized that the app never starts listening for requests. 
Because it waits until `ExecuteAsync` method of the hosted service returns.
But that never happens because service waits until the first request. 


```c#
// Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddHostedService<BackgroundWorker>(); // <-- won't work!
    services.AddSingleton<PublicUrlRegistry>();
}
```

We've got a [deadlock][deadlock].

```powershell
PS> dotnet run
Building...
info: WaitForFirstRequestDemo.BackgroundWorker[0]
      Waiting for the first request
```



## Making sure hosted service starts after the server starts listening

The solution comes from [IHostedService's docs][hostedservice]. 
If we register hosted service in Startup class then it runs before the app starts listening to requests.

We need to move the registration to where [`IHost`][host] is built, i.e. `Program` class, instead. 
We need to call `ConfigureServices` after `ConfigureWebHostDefaults` and register the service there.

```c#
public class Program
{
    public static void Main(string[] args)
    {
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder => { webBuilder.UseStartup<Startup>(); }) // <-- first configure web
            .ConfigureServices(collection => collection.AddHostedService<BackgroundWorker>()); // <-- then register hosted service
}

```

When I run the app and send a request, everything works as it should.

```powershell
PS> dotnet run
Building...
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: WaitForFirstRequestDemo.BackgroundWorker[0]
      Waiting for the first request
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET https://localhost:5001/ - -
info: WaitForFirstRequestDemo.BackgroundWorker[0]
      Got https://localhost:5001
```


[manuelresetevent]: https://docs.microsoft.com/en-us/dotnet/api/system.threading.manualresetevent
[deadlock]: https://en.wikipedia.org/wiki/Deadlock
[hostedservice]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-5.0&tabs=visual-studio#ihostedservice-interface
[host]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/host/generic-host?view=aspnetcore-5.0