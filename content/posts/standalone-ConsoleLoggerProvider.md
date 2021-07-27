---
title: "How to create a standalone ConsoleLoggerProvider"
date: 2021-07-27
draft: false
author: Mike Hadlow
---
If, for whatever reason you want to create a stand alone instance of `ConsoleLoggerProvider` without having to leverage dependency injection and the full Hosting framework, you'll find that the `ConsoleLoggerProvider`'s constructor requires an instance of an `IOptionsMonitor<T>`, the only instance of which `OptionsMonitor<T>` in turn has a complex constructor with many dependencies. This all seems like a failure of design on Microsoft's part. Here I give a simple no-op `IOptionsMonitor<T>` implementation to allow one to easily create a `ConsoleLoggerProvider`.
<!--more-->
```C#
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;
using System;

namespace Sample
{
    class Program
    {
        static void Main()
        {
            var loggerProvider = new ConsoleLoggerProvider(new OptionsMonitor<ConsoleLoggerOptions>(new ConsoleLoggerOptions()));
            // use the loggerProvider ...
        }
    }

    public class OptionsMonitor<T> : IOptionsMonitor<T>
    {
        private readonly T options;

        public OptionsMonitor(T options)
        {
            this.options = options;
        }

        public T CurrentValue => options;

        public T Get(string name) => options;

        public IDisposable OnChange(Action<T, string> listener) => new NullDisposable();

        private class NullDisposable : IDisposable
        {
            public void Dispose() { }
        }
    }
}
```