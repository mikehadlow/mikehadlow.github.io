---
title: "Add event handlers dynamically using reflection"
date: 2022-04-28
draft: false
author: Mike Hadlow
---
Recently I had a situation where I needed to test a class with dozens of event handlers. Rather than manually write the repetitive code to attach the handlers I decided to cheat and use reflection. Since there wasn't anything immediately available online that I could find, I'm sharing an example here to show how to do it.
<!--more-->
The code below is a simple console application that demonstrates this technique. There is a class `ThingWithEvents` that exports a couple of events, `OnSayHello` and `OnCounter`. The program creates an instance of this class then calls `SubscribeToEvents`. This reflects over all the events in the given type and for each event calls `GetHandlerFor` which generates an `EventHandler<T>` delegate of the correct type.

There's a [GitHub Gist here](https://gist.github.com/mikehadlow/3d7fdc986ef913c1d689dcbdecd7ae70) for any suggestions or comments.

```C#
namespace EventHandlersByReflection;

using System.Reflection;
using static System.Console;

public class Program
{
    public static void Main()
    {
        var thing = new ThingWithEvents();

        SubscribeToEvents(thing);

        thing.SayHello("Hello World!");
        thing.Count();
        thing.Count();
    }

    private static void SubscribeToEvents<T>(T target)
    {
        foreach(var @event in target.GetType().GetEvents())
        {
            var handler = GetHandlerFor(@event);
            @event.AddEventHandler(target, handler);
            WriteLine($"Subscribed to {@event.Name}");
        }
    }

    static MethodInfo? genericHandlerMethod = typeof(Program).GetMethod("Handler", BindingFlags.Static | BindingFlags.NonPublic);

    private static Delegate GetHandlerFor(EventInfo eventInfo)
    {
        var eventArgsType = eventInfo.EventHandlerType?.GetMethod("Invoke")?.GetParameters()[1]?.ParameterType;
        if(eventArgsType is null)
        {
            throw new ApplicationException("Couldn't get event args type from eventInfo.");
        }
        var handlerMethod = genericHandlerMethod?.MakeGenericMethod(eventArgsType);
        if(handlerMethod is null)
        {
            throw new ApplicationException("Couldn't get handlerMethod from genericHandlerMethod.");
        }
        
        return Delegate.CreateDelegate(typeof(EventHandler<>).MakeGenericType(eventArgsType), handlerMethod);
    }

    // zero refernces, but accessed via reflection. Do not delete!
    private static void Handler<TArgs>(object? sender, TArgs args)
    {
        if(args is SayHelloEventArgs sayHelloEventArgs)
        {
            WriteLine($"SayHello said: {sayHelloEventArgs.Messsage}");
        }
        if(args is CounterEventArgs counterEventArgs)
        {
            WriteLine($"Counter is {counterEventArgs.Counter}");
        }
    }
}

public class ThingWithEvents
{
    private int counter = 0;

    public void SayHello(string message)
    {
        OnSayHello(this, new SayHelloEventArgs { Messsage = message });
    }

    public void Count()
    {
        OnCounter(this, new CounterEventArgs { Counter = counter });
        counter++;
    }

    public event EventHandler<SayHelloEventArgs> OnSayHello;
    public event EventHandler<CounterEventArgs> OnCounter;
}

public class SayHelloEventArgs : EventArgs
{
    public string Messsage { get; set; } = "";
}

public class CounterEventArgs : EventArgs
{
    public int Counter { get; set; } = 0;
}

```

