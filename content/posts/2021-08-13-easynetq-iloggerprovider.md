---
title: "Register a Microsoft.Extensions.Logging.ILoggerProvider with EasyNetQ"
date: 2021-08-13
draft: false
author: Mike Hadlow
---
[EasyNetQ](https://easynetq.com/) is an opinionated fully featured client API for [RabbitMQ](https://www.rabbitmq.com/). It provides extensive diagnostic logging capabilities via [LibLog](https://github.com/damianh/LibLog) a logging abstraction that provides support for many common logging libraries. Unfortuntely LigLog doesn't support `Microsoft.Extensions.Logging`, but this post provides an adaptor, `EasyNetQMicrosoftExtensionsLogProvider` that will allow EasyNetQ to log to a `Microsoft.Extensions.Logging.ILoggerProvider`.
<!--more-->
Use it like this:
```C#
using EasyNetQ;
using EasyNetQ.Logging;

// ...
// loggerProvider is your Microsoft.Extensions.Logging.ILoggerProvider
LogProvider.SetCurrentLogProvider(new EasyNetQMicrosoftExtensionsLogProvider(loggerProvider));
// Call CreateBus after setting the current log provider
RabbitHutch.CreateBus(..);
```
Copy the code below into a file named `EasyNetQMicrosoftExtensionsLogProvider.cs` in your project.
```C#
using System;
using EasyNetQ.Logging;
using Microsoft.Extensions.Logging;

namespace YourNamespace
{
    public class EasyNetQMicrosoftExtensionsLogProvider : ILogProvider
    {
        private readonly ILoggerProvider loggerProvider;

        public EasyNetQMicrosoftExtensionsLogProvider(ILoggerProvider loggerProvider)
        {
            this.loggerProvider = loggerProvider ?? throw new ArgumentNullException(nameof(loggerProvider));
        }

        public Logger GetLogger(string name)
        {
            var logger = loggerProvider.CreateLogger(name);

            return (logLevel, messageFunc, exception, formatParameters) =>
            {
                if (messageFunc == null)
                {
                    return true;
                }

                var msLogLevel = logLevel switch 
                { 
                    EasyNetQ.Logging.LogLevel.Debug => Microsoft.Extensions.Logging.LogLevel.Debug,
                    EasyNetQ.Logging.LogLevel.Error => Microsoft.Extensions.Logging.LogLevel.Error,
                    EasyNetQ.Logging.LogLevel.Fatal => Microsoft.Extensions.Logging.LogLevel.Critical,
                    EasyNetQ.Logging.LogLevel.Info => Microsoft.Extensions.Logging.LogLevel.Information,
                    EasyNetQ.Logging.LogLevel.Trace => Microsoft.Extensions.Logging.LogLevel.Trace,
                    EasyNetQ.Logging.LogLevel.Warn => Microsoft.Extensions.Logging.LogLevel.Warning,
                    _ => Microsoft.Extensions.Logging.LogLevel.None
                };

                var message = messageFunc();

                if(exception is Exception)
                {
                    logger.Log(msLogLevel, exception, message, formatParameters);
                }
                else
                {
                    logger.Log(msLogLevel, message, formatParameters);
                }

                return true;
            };
        }

        public IDisposable OpenMappedContext(string key, object value, bool destructure = false)
            => NullDisposable.Instance;

        public IDisposable OpenNestedContext(string message)
            => NullDisposable.Instance;

        private class NullDisposable : IDisposable
        {
            internal static readonly IDisposable Instance = new NullDisposable();

            public void Dispose()
            { }
        }

    }
}
```