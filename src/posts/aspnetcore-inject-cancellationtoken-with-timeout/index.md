---
title: Adding a default timeout to CancellationToken parameters in ASP.NET Core
description: Set a default timeout for CancellationToken that ASP.NET Core binds to action parameters
tags:
  - aspnetcore
  - c#
  - post
date: 2021-06-29
---

ASP.NET Core allows us to inject a `CancellationToken` in actions:

```c#
[HttpGet]
public Task<ActionResult> GetLoggedInUser(CancellationToken cancellationToken) { ... }
```

This cancellation token is actually bound to `HttpContext.RequestAborted`, and it is signalled when the request is cancelled.

We can flow this token down to any async method that accepts it and help coordinate their cancellation if the request is cancelled by the user (due to page navigation, for example). 
This prevents wasting time doing heavy work, and having to throw it all away for a client that's already gone.

## Problem

How can we add a default timeout to this token, so that the operation is cancelled either when the request is cancelled or it takes too long?

## Model binding

:::
MVC framework performs model binding on action parameters by parsing the request into usable data structures. 
It is used for reading the request body serialized as JSON to a class, or extracting a form field, or reading file stream into an `IFormFile`, among other things.

:::recommend
    [Model binding for query parameters encoded as JSON in ASP.NET Core][post_jsonquery]{.link}
:::


`CancellationToken`s are bound to `HttpContext.RequestAborted` by `CancellationTokenModelBinder` class. 
We'll replace it with our own implementation that will set the token to expire with a timeout.

But first, how do we join cancellation tokens together?

## Combining cancellation tokens

We can merge multiple cancellation tokens into one with `CancellationTokenSource.CreateLinkedTokenSource` method. 
Here we create a timeout token, and link it to another:

```c#
var cancellationToken = // ...

var timeoutCts = new CancellationTokenSource();
timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(timeoutCts.Token, cancellationToken);
```

Time to put it to use.

## Building a model binder for cancellation tokens

Looking at the source code for `CancellationTokenModelBinder`, it doesn't do much, but we'll still use it as our starting point.
We'll subclass it, but with a twist. Because it doesn't mark `BindModelAsync` method as `virtual` we can't override it with an `override` keyword.
By implementing the `IModelBinder` interface that the base class implements, [we can get over this limitation][overriding] and still "override" it without actually using `override`.

After letting the base class perform the binding, we'll take the bound token, and replace it with a new one.

Since we've replaced the token object, we'll have to rebuild the validation state. In fact, why not just copy over what ASP.NET Core team has put there
because I don't know enough about to disagree with them.

```c#
private class TimeoutCancellationTokenModelBinder : CancellationTokenModelBinder, IModelBinder
{
    public new async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        await base.BindModelAsync(bindingContext);
        if (bindingContext.Result.Model is CancellationToken cancellationToken)
        {
            // combine the default token with a timeout
            var timeoutCts = new CancellationTokenSource();
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(5));
            var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(timeoutCts.Token, cancellationToken);

            // We need to force boxing now, so we can insert the same reference to the boxed CancellationToken
            // in both the ValidationState and ModelBindingResult.
            //
            // DO NOT simplify this code by removing the cast.
            var model = (object)combinedCts.Token;
            bindingContext.ValidationState.Clear();
            bindingContext.ValidationState.Add(model, new ValidationStateEntry() { SuppressValidation = true });
            bindingContext.Result = ModelBindingResult.Success(model);
        }
    }
}
```

We also need a provider to introduce this model binder to MVC pipeline:

```c#
public class TimeoutCancellationTokenModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context?.Metadata.ModelType != typeof(CancellationToken))
        {
            return null;
        }

        return new TimeoutCancellationTokenModelBinder();
    }

    private class TimeoutCancellationTokenModelBinder : CancellationTokenModelBinder, IModelBinder
    {
        // ...
    }
}
```

## Replacing model binders

MVC has [many model binders in place][modelbinderproviders] to handle all kinds of parsing and binding for various types of parameters and sources.
We need to put ours in the first place to run it before all others. We'll also remove the original cancellation token binder 
in order to prevent both binders from working over themselves.

```c#
services.Configure<MvcOptions>(options =>
{
    options.ModelBinderProviders.RemoveType<CancellationTokenModelBinderProvider>();
    options.ModelBinderProviders.Insert(0, new TimeoutCancellationTokenModelBinderProvider());
});
```

## Usage

Let's put it to practice. We'll try to run a long async task that takes 6 seconds. 
The `CancellationToken` parameter will be bound by our binder and it is set to expire after 5 seconds.
After 5 seconds, it will throw an `TaskCanceledException` and cancel the execution.

```c#
[HttpGet("")]
public async Task<IActionResult> Index(CancellationToken cancellationToken)
{
    await Task.Delay(TimeSpan.FromSeconds(6), cancellationToken);
    return Ok("hey");
}
```

Now let's get rid of the hardcoded values.

## Making it configurable

We've set the timeout to 5 seconds, but it'd be better if it were configurable. We'll use the [options pattern][options] for this.
Let's create a class to encapsulate the options.

```c#
public class TimeoutOptions
{
    public int TimeoutSeconds { get; set; } = 10; // seconds
    public TimeSpan Timeout => TimeSpan.FromSeconds(TimeoutSeconds);
}
```

We can configure the timeout in `ConfigureServices`:

```c#
services.Configure<TimeoutOptions>(configuration => { configuration.TimeoutSeconds = 10; });
```

and take this as a parameter in the binder provider. 

```c#
public class TimeoutCancellationTokenModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        // ...

        // resolve the configuration from the container
        var config = context.Services.GetRequiredService<IOptions<TimeoutOptions>>().Value;
        // pass it down to the binder
        return new TimeoutCancellationTokenModelBinder(config);
    }

    private class TimeoutCancellationTokenModelBinder : CancellationTokenModelBinder, IModelBinder
    {
        // then inject it to the binder
        private readonly TimeoutOptions _options;

        public TimeoutCancellationTokenModelBinder(TimeoutOptions options)
        {
            _options = options;
        }

        public new async Task BindModelAsync(ModelBindingContext bindingContext)
        {
            // ...
            if (/* ... */)
            {
                // use the configured timeout value
                var timeoutCts = new CancellationTokenSource();
                timeoutCts.CancelAfter(_options.Timeout);
                // ...
            }
        }
    }
}
```


That's it. Thanks for reading.

[overriding]: /posts/csharp-overriding-non-virtual-methods/
[options]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options
[modelbinderproviders]: https://github.com/dotnet/aspnetcore/blob/9fa3421e1302bce7dbc50269edbd3072907e7832/src/Mvc/Mvc.Core/src/Infrastructure/MvcCoreMvcOptionsSetup.cs#L62-L78
[post_jsonquery]: /posts/aspnetcore-model-binding-json-query-params/
