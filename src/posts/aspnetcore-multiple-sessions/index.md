---
title: Authenticating a user with multiple social providers simultaneously in ASP.NET Core
description: A guide on setting up and troubleshooting multiple auth schemes in ASP.NET Core
tags:
  - aspnetcore
  - auth
  - post
date: 2021-07-29
---

Assume we have an app that gives users the option to [login with Google, GitHub, Facebook, etc.][social_auth]. We want to let users login with any identity provider and save their session to access the claims they provide later.

For example, if I login with Google, it returns claims about the logged-in user, such as his name, email, account id. The same holds true for GitHub and all other OIDC providers.

## Problem

If the user signs in with his Google account, then signs in with GitHub, the session cookie for Google is overwritten by that of GitHub's.

How can we access all active sessions and read the claims?

## Setting up authentication for Google and GitHub

We define the authentication schemes like this:

```c#
services.AddAuthentication(options => options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie()
    .AddGoogle(options => {
            // set the client id + secret
            Configuration.GetSection("Google").Bind(options);
    })
    .AddGitHub(options => {
            // set the client id + secret
            Configuration.GetSection("GitHub").Bind(options);
    });
services.AddAuthorization();
```

We use a cookie to hold the user session, and a couple of external id providers to offer the users. The credentials are stored in `appsettings.json` in this format, so they play nice[^1] with the `IConfiguration.Bind()` method:

```json
{
  "GitHub": {
    "ClientId": "c27966ecf4087378",
    "ClientSecret": "66c71cdac566e43d869dd3c70318ed5e8df22af7a565f068adef6a6bacf6aca7"
  },
  "Google": {
    "ClientId": "ed5a20d944fd12ebe33ad0de.apps.googleusercontent.com",
    "ClientSecret": "87a3a35d003d1622c6bdbf454c0e3608ca68b1e780c965df4c52dc2f9b2c9d78"
  }
}
```

Now when we [issue a challenge][challenge], the user is forced to login with a provider:

```c#
[ApiController]
public class AccountController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("/login-google")]
    public ActionResult LoginGoogle()
    {
        return Challenge(
            new AuthenticationProperties
            {
                RedirectUri = Url.Action("WhoAmI"),
            }, GoogleDefaults.AuthenticationScheme
        );
    }

    [AllowAnonymous]
    [HttpGet("/login-GitHub")]
    public ActionResult LoginGitHub()
    {
        return Challenge(
            new AuthenticationProperties
            {
                RedirectUri = Url.Action("WhoAmI"),
            }, GitHubAuthenticationDefaults.AuthenticationScheme
        );
    }
}
```

Visiting `/login-google`, the app redirects us to Google sign in page, and after logging in, we are redirected back
to `WhoAmI` action, which dumps all user claims.

```c#
[AllowAnonymous]
[HttpGet("/me")]
public async Task<ActionResult> WhoAmI()
{
    // dump all claims
    return Ok(
        User.Identities.Select(
                id => new
                {
                    id.AuthenticationType,
                    Claims = id.Claims.Select(c => new { c.Type, c.Value })
                }
            )
            .ToList()
    );
}
```

The result is an empty JSON:

```json
[
  {
    "authenticationType": null,
    "claims": []
  }
]
```

`WhoAmI` action doesn't do anything, because we're bypassing authentication with `[AllowAnonymous]`. We need to add `[Authorize]` attribute
and specify an authentication scheme to access the claims for that session.

```c#
[Authorize(AuthenticationSchemes = GoogleDefaults.AuthenticationScheme)]
[HttpGet("/me")]
public async Task<ActionResult> WhoAmI()
{
    // `User` now contains Google claims
    // ...
}
```

## Disappearing sessions

Now if we log in with GitHub by visiting `/login-github`, and sign in with our credentials, we're redirected to `/me`,
but it keeps redirecting us to Google's login page. What is happening here?

When we've signed in on GitHub, the session is saved to the cookie we've added with `.AddCookie()`, since it is the
default authentication scheme. And unless specified otherwise, all authentication actions default to the `DefaultScheme`
.

```c#
services.AddAuthentication(options => options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie()
    // ...
```

To prevent losing our Google session, we need a separate cookie to store it. Let's add another one and give both a
better name while we're at it. Then we use those cookies to store Google & GitHub sessions:

```c#
services.AddAuthentication()
    .AddCookie("GoogleSession")
    .AddCookie("GitHubSession")
    .AddGoogle(options => {
        // ...
        // save session to this cookie
        options.SignInScheme = "GoogleSession";
    })
    .AddGitHub(options => {
        // ...
        // save session to this cookie
        options.SignInScheme = "GitHubSession";
    });
```

Now `WhoAmI` action works as expected and we get a list of Google claims thanks to `[Authorize]` attribute:

```json
[
  {
    "authenticationType": "Google",
    "claims": [
      {
        "type": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        "value": "13131323423131413123"
      },
      {
        "type": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "value": "Abdussamet Koçak"
      },
      // ...
    ]
  }
]
```

If we change the `[Authorize]` attribute to `GitHub`, we get GitHub claims. But not both. For that we need to specify the names of both separated with a comma:

```c#
[Authorize(AuthenticationSchemes = "Google,GitHub")]
```

We can't concatenate the constants `GoogleDefaults.AuthenticationScheme`
and `GitHubAuthenticationDefaults.AuthenticationScheme` here, because C# doesn't support concatenated constants (yet,
but [it's on its way to C# 10][concatenated_const]), so instead, we're using their values.

Now `/me` returns claims for both sessions:

```json
[
  {
    "authenticationType": "GitHub",
    "claims": [
      // ... GitHub claims
    ]
  },
  {
    "authenticationType": "Google",
    "claims": [
      // ... google claims
    ]
  }
]
```

## Setting a default authorization policy

Specifying all these magic values by hand is tedious. Luckily ASP.NET Core gives us some other options to achieve the same result.

After configuring a default authorization policy that forces the user authenticate with multiple schemes,

```c#
services.AddAuthorization(options =>
    options.DefaultPolicy = new AuthorizationPolicyBuilder(
            GoogleDefaults.AuthenticationScheme,
            GitHubAuthenticationDefaults.AuthenticationScheme
        )
        .RequireAuthenticatedUser()
        .Build()
);
```

we can get rid of auth the arguments in `[Authorize]` and use the default policy.

```c#
[Authorize]
[HttpGet("/me")]
public async Task<ActionResult> WhoAmI() { ... }
```

## Resources

- [Microsoft's docs on getting started with ASP.NET Core auth][auth_intro]
- [Microsoft's docs on setting up social authentication][social_auth]

[^1]:
    Keys in the `appsettings.json` configuration file correspond to the properties in the option class of their
    respective auth schemes.

[auth_intro]: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/
[social_auth]: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/social/
[concatenated_const]: https://GitHub.com/dotnet/csharplang/issues/2951
[challenge]: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-5.0#challenge