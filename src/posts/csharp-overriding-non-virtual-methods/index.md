---
title: Overriding non-virtual methods in C#
description: Not all methods are virtual, but we can still override them (with caveats)
tags:
  - aspnetcore
  - auth
  - post
date: 2021-07-29
---

C# lets us add `virtual` modifier to a method to indicate that it can be overridden by the subclasses of that (non-`sealed`) class.

## Problem

[Microsoft says](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/override):

> You cannot override a non-virtual or static method. The overridden base method must be `virtual`, `abstract`, or `override`.

When working with a library, sometimes we _really_ need to override a method to plug our own logic, but darn it, it's not `virtual`, definitely not `abstract`, it doesn't have `override` either. What do we do? 

## Trick

We have one crucial condition for this trick to work: **the method we want to override must come from an interface implemented by the class.**

```c#
interface IEmailSender {
    Task<SendResult> SendAsync(MailMessage email);
}

public class DefaultEmailSender : IEmailSender
{
    public Task<SendResult> SendAsync(MailMessage email)
    {
        // ...
    }
}
```

We want to override the `SendAsync` method, but it's not `virtual`/`override`. Don't fret, in three easy steps, we can override it:

0. Create a subclass
1. Implement the interface that provides the method
2. Add `new` modifier

```c#
public class ConsoleEmailSender : IEmailSender
{
    public new Task<SendResult> SendAsync(MailMessage email)
    {
        // custom logic!
    }
}
```

We can modify the arguments, call the base implementation and modify the result:

```c#
public class ConsoleEmailSender : IEmailSender
{
    public new async Task<SendResult> SendAsync(MailMessage email)
    {
        // ... modify the arguments

        Console.WriteLine(email.Subject);
        email.Subject = "console";
        
        var result = await base.SendAsync(bindingContext);

        // ... modify the results

        return result;
    }
}
```

It is a neat little trick that I resort to from time to time.