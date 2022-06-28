---
title: "A Simple Console Periodic Loop in C#"
date: 2021-07-09
draft: false
author: Mike Hadlow
---
I found myself writing the same code several times for a simple console periodic loop, so I'm posting the framework here mainly for my own benefit. This uses C# 7's new async Main entry point and avoids the need to spawn a new thread for the loop. Worth noting though that each iteration after the `Task.Delay` will run on a threadpool thread.
<!--more-->
```C#
using System;
using System.Threading;
using System.Threading.Tasks;
using static System.Console;

namespace SimpleConsoleLoop
{
    class Program
    {
        static Task Main()
        {
            var cts = new CancellationTokenSource();

            CancelKeyPress += (_, args) => 
            {
                cts.Cancel();
                cts.Dispose();
                args.Cancel = true;
            };

            WriteLine("Starting loop. Ctrl-C to stop.");
            return RunLoop(cts.Token);
        }

        static async Task RunLoop(CancellationToken cancellation)
        {
            try
            {
                while (!cancellation.IsCancellationRequested)
                {
                    await Task.Delay(1000, cancellation);

                    WriteLine($"Loop! On thread: {Thread.CurrentThread.ManagedThreadId}");
                }
            }
            catch (TaskCanceledException) { }
            catch (Exception exception)
            {
                WriteLine(exception.ToString());
            }
        }
    }
}
```