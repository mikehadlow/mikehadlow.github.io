---
title: "Blocking XREAD From A Redis Stream Using StackExchange.Redis"
date: 2022-02-18
draft: true
author: Mike Hadlow
---
The [StackExchange.Redis](https://github.com/StackExchange/StackExchange.Redis) NuGet package is the most popular .NET client for [Redis](https://redis.io/). It's stable, high-performance, with a great community and wide usage. One of it's most interesting features is the way it does network [multiplexing](https://stackexchange.github.io/StackExchange.Redis/PipelinesMultiplexers.html#multiplexing). This allows multi-threaded applications to use a single TCP/IP connection without blocking. Unfortunately this also means that the library does not support blocking operations such as `XREAD BLOCK`, which is important if you want to leverage [Redis Streams](https://redis.io/topics/streams-intro) on .NET. This post offers a work-around for this.
<!--more-->
From the StackExchange.Redis [Multiplexing documentation](https://stackexchange.github.io/StackExchange.Redis/PipelinesMultiplexers.html#multiplexing)

> ... For this reason, the only redis features that StackExchange.Redis does not offer (and _will not ever offer_) are the “blocking pops” ([BLPOP](https://redis.io/commands/blpop), [BRPOP](https://redis.io/commands/brpop) and [BRPOPLPUSH](https://redis.io/commands/brpoplpush)) - because this would allow a single caller to stall the entire multiplexer, blocking all other callers.

Redis Streams have been available since Redis version 5.0. They implement an append only log. One of the key features is the ability for clients to listen for new stream entries in a way analogous to a queue subscriber in a messaging system. This is implemented with the [`XREAD BLOCK`](https://redis.io/commands/xread) command. The `XREAD` command can also be used without `BLOCK`, so an alternative is to simply poll the server, but this introduces a polling interval latency that's unacceptable with high throughput systems.

The lack of `XREAD` provision for StackExchange.Redis has lead to much discussion on Stack Overflow and GitHub; see [here](https://stackoverflow.com/questions/58762692/how-to-do-a-blocking-read-from-c-sharp-stackexchange-redis-nuget-package-on-redi) and [here](https://github.com/StackExchange/StackExchange.Redis/issues/1158#issuecomment-499389882) for example. There has been a [task to rewrite the internals to support blocking operations](https://github.com/StackExchange/StackExchange.Redis/issues/886) since 2018, but it is still open. I expect that until Stack Overflow themselves find a need for blocking operations we're unlikely to see it, especially now that the author, the hugely prolific, [Marc Gravell](https://twitter.com/marcgravell) (who someone really should pay just to work on open source) has moved onto Microsoft.

My colleague Marc Stedman has been experimenting with the low level StackExchange.Redis `ExecuteAync` method to issue the raw `XREAD BLOCK` command to the server. Of course because of the multiplexer this will block all other operations, so it's important to run it on a dedicated connection. Marc Gravell also says this on [this thread](https://github.com/StackExchange/StackExchange.Redis/issues/1117#issuecomment-481844315):

> If you use the raw commands API to execute blocking operations, you should expect bad things to happen. For example, from the connection's perspective, it won't be responding to periodic heartbeat health checks, so it will sever the connection every so often.

However, if we keep the blocking period short, say 500ms, then there's less chance of timeouts. There's obviously a trade off between a shorter interval pummeling the server with read requests, especially if you have lots of clients. In our experiments we've not seen any issues so far. 

The other (minor) disadvantage of using the raw `ExecuteAsync` command is that the stream entries are returned as a nested `RedisResult` tree, but it's straightforward to decode using the `XREAD` documentation.

Below is an example implementation that you can modify for your own use:
```C#
using StackExchange.Redis;
using static System.Console;

public static class BlockingReader
{
    public static async Task Listen(
        string connection, 
        string streamName, 
        CancellationToken cancellation,
        Action<Entry> handler)
    {
        // The blocking reader's connection should not be shared with any other operation.
        var redis = ConnectionMultiplexer.Connect(connection);
        if(redis is null)
        {
            WriteLine($"Connection to {connection} failed");
            return;
        }
        WriteLine($"Started consuming from stream {streamName}");

        try
        {
            var db = redis.GetDatabase();

            var currentId = "$"; // listen for new messages
            while(!cancellation.IsCancellationRequested)
            {
                var arguments = new List<object>
                {
                    "BLOCK",
                    "500",
                    "STREAMS",
                    streamName,
                    currentId
                };

                // ExecuteAsync does not take a CancellationToken, so we have to wait the block time
                // before resonding to a cancellation request.
                var result = await db.ExecuteAsync("XREAD", arguments).ConfigureAwait(false);

                if(!result.IsNull)
                {
                    // should only be a single result if querying a single stream
                    foreach (RedisResult[] subresults in (RedisResult[])result)
                    {
                        var name = (RedisValue)subresults[0];
                        foreach(RedisResult[] messages in (RedisResult[])subresults[1])
                        {
                            var id = (RedisValue)messages[0];

                            var nameValuePairs = (RedisResult[])messages[1];
                            var pairs = new Pair[nameValuePairs.Length/2];

                            for(var i = 0; i < nameValuePairs.Length; i+=2)
                            {
                                pairs[i / 2] = new Pair((RedisValue)nameValuePairs[i], (RedisValue)nameValuePairs[i + 1]);
                            }

                            var entry = new Entry(name, id, pairs);
                            handler(entry);
                        }
                    }
                }
            }
        }
        catch (TaskCanceledException) { }
        catch (Exception ex)
        {
            WriteLine(ex.ToString());
        }
        finally
        {
            WriteLine($"Stopped consuming from stream {streamName}");
        }
    }
}

public record Entry(RedisValue StreamName, RedisValue Id, Pair[] Values);

public record Pair(RedisValue Name, RedisValue Value);
```
I've also shared a worked example on GitHub, [RedisStreamReader](https://github.com/mikehadlow/RedisStreamReader), of a simple console application that publishes to a stream and uses the method above to listen for new messages.