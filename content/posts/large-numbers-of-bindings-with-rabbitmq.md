---
title: "Large Numbers of Bindings With RabbitMQ"
date: 2021-08-19
draft: false
author: Mike Hadlow
---
RabbitMQ (or more specifically the AMQP protocol) provides a degree of flexibility over other message-queue solutions with its exchange-binding-queue model. Some possible solutions to scaling or business issues result in large numbers of bindings being created, perhaps thousands per queue. We tested RabbitMQ to find out what the binding performance limits were and present the results in this post. It seems that large numbers of bindings are not in themselves a performance issue, but on a RabbitMQ cluster, "binding churn" the rate at which they are created and destroyed can have a large impact on message delivery.
<!--more-->
_I don't intend this post as a tutorial on the exchange-binding-queue model, for an excellent introduction see the [RabbitMQ documentation](https://www.rabbitmq.com/tutorials/tutorial-four-dotnet.html)._

We were interested in looking at solutions which allowed us to shard our consumers by collections of particular entity IDs, with possibly thousands of entities being active during any time period. To test this I created a producer and consumer that would create arbitrary numbers of bindings to any number of consumers all bound to a single exchange and also enable us to scale the message rates published to the exchange.

The test harnesses are available on GitHub [here](https://github.com/mikehadlow/RmqBindingTest). The readme gives detailed instructions on how to run the tests.

I ran my first set of tests against a single instance RMQ broker and got these results:

__10 Consumers. 500 messages/second__

|Bindings/Queue | RMQ Mem| Erlang Processes  | CPU (server) |
|---------------|--------|-------------------|--------------|
|1              | 292    | 1754              |  10|
|10             | 293    | 1754              |  10|
|100            | 292    | 1754              |  10|                
|1000           | 288    | 1754              |  10|

__10 Consumers. 4000 messages/second__

|Bindings/Queue | RMQ Mem| Erlang Processes  | CPU (server)|
|---------------|--------|-------------------|--------------|
|1              | 550    | 2370              |  32|
|10             | 475    | 2370              |  33|
|100            | 293    | 2370              |  33|
|1000           | 300    | 2370              |  33|

The striking result is that it seems to make almost no difference to performance how many bindings one has, at least up to the total of 10,000 that I pushed it to (Our scenario didn't envisage larger numbers than this, so I didn't test any higher). This suggests that the internal routing algorithm is very efficient, at least O(log n). Internally I believe it uses a [trie](https://en.wikipedia.org/wiki/Trie) data structure.

One thing I did notice though, was that with large numbers of bindings there was a slight delay, in the order of a few seconds or tens of seconds, from the bindings' creation to the delivery of the first message.

__3 Node Cluster__

Moving onto testing against a 3 node cluster the performance results were very similar to those above and didn't change notably as the number of bindings rose (so I haven't included them here). This was with the producers and consumers connecting via a front side load balancing proxy which resulted in the ten producers and ten consumers being evenly distributed across the nodes. However what was immediately noticeable was a much longer delay between creating the bindings and the first message being delivered to the consumers. With 1000 bindings per queue it took over 5 minutes for the first message to be delivered. It seems that the prime performance bottleneck is the time it takes for the Erlang infrastructure to distribute the bindings to the cluster. It suggests that if one is going to create large numbers of bindings on a RabbitMQ cluster that one needs to be very aware of "binding churn", the rate at which the bindings are created and removed because this can have a major impact on message delivery.