---
title: "Microsoft.Extensions.DependencyInjection object graph writer"
date: 2021-07-20
draft: false
author: Mike Hadlow
---
It's very useful sometimes to be able to quickly view the object graph created by a dependency injection (or IoC) container, especially when you're a new starter on an existing project. I was recently attempting to get up to speed on a .NET Core project, but I couldn't find anything that would output an object graph from the `Microsoft.Extensions.DependencyInjection` `IServiceCollection`, so I wrote a simple class that reads the graph and outputs a basic representation. I'm sharing it here for my own benefit, but also as a starting point if anyone else needs something similar.
<!--more-->
This writes out a textural representation of an object graph based on the services registered to your `IServiceCollection`. It's very very basic, and works simply by picking the first constructor of each registered implementation and reflecting over its arguments. It handles `IEnumerable<T>` arguments as well. It should be used for information only. _There are no guarantees that it will show your actual application's object graph correctly_.

It outputs a custom format, but one which displays nicely when opened in VS Code, and allows nodes to be opened and closed, which is great for large graphs.

Copy the code below into a new file named `ServiceCollectionWriter.cs` in your application and call it after registering your services, specifying the root of your graph (here `IHostedService`), your `IServiceCollection` instance, and either a writer function (such as `System.Console.WriteLine`) or a file path.

    ServiceCollectionWriter.WriteObjectGraph<IHostedService>(services, Console.WriteLine);

Or...

    ServiceCollectionWriter.WriteObjectGraph<IHostedService>(services, "C:/Temp/my-object-graph.txt");

```C#
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace MyNamespace
{
    public class ServiceCollectionWriter
    {
        public static void WriteObjectGraph<TRoot>(IServiceCollection services, string path)
        {
            using var writer = new StreamWriter(File.OpenWrite(path));

            WriteObjectGraph<TRoot>(services, writer.WriteLine);
        }

        public static void WriteObjectGraph<TRoot>(IServiceCollection services, Action<string> writeLine)
        {
            var serviceLookup = new Dictionary<Type, List<ServiceDescriptor>>(); 
            foreach(var descriptor in services)
            {
                if(serviceLookup.ContainsKey(descriptor.ServiceType))
                {
                    serviceLookup[descriptor.ServiceType].Add(descriptor);
                }
                else
                {
                    serviceLookup.Add(descriptor.ServiceType, new List<ServiceDescriptor> { descriptor });
                }
            }

            WriteNode(typeof(TRoot), 0);

            void WriteNode(Type serviceType, int indent)
            {
                var tab = new string(' ', indent * 2);
                if(serviceLookup.ContainsKey(serviceType))
                {
                    foreach (var descriptor in serviceLookup[serviceType])
                    {
                        if (descriptor.ImplementationType != null)
                        {
                            writeLine($"{tab}{descriptor.ServiceType.Name} -> {descriptor.ImplementationType.Name}");
                            writeLine($"{tab}{{");
                            var parameters = descriptor.ImplementationType.GetConstructors().First().GetParameters();
                            foreach (var parameter in parameters)
                            {
                                if(parameter.ParameterType.IsGenericType 
                                    && parameter.ParameterType.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                                {
                                    WriteNode( parameter.ParameterType.GetGenericArguments().First(), indent + 1);
                                }
                                else
                                {
                                    WriteNode(parameter.ParameterType, indent + 1);
                                }
                            }
                            writeLine($"{tab}}}");
                        }
                        else if (descriptor.ImplementationFactory != null)
                        {
                            writeLine($"{tab}{serviceType.Name} -> FACTORY");
                        }
                        else if (descriptor.ImplementationInstance != null)
                        {
                            writeLine($"{tab}{serviceType.Name} -> INSTANCE");
                        }
                        else
                        {
                            writeLine($"{tab}{serviceType.Name} -> UNKNOWN");
                        }
                    }
                }
                else
                {
                    writeLine($"{tab}{serviceType.Name} -> NOT RESOLVED");
                }
            }
        }
    }
}
```