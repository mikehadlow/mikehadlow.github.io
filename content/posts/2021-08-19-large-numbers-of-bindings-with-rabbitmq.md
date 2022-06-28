---
title: "Large Numbers of Bindings With RabbitMQ"
date: 2021-08-19
draft: false
author: Mike Hadlow
---
RabbitMQ (or more specifically the AMQP protocol) provides a degree of flexibility over other message-queue solutions with its exchange-binding-queue model. Some possible solutions to scaling or business issues result in large numbers of bindings being created, perhaps thousands per queue. We tested RabbitMQ to find out what the binding performance limits were and present the results in this post. It seems that large numbers of bindings are not in themselves a performance issue, but on a RabbitMQ cluster, "binding churn" the rate at which they are created and destroyed can have a large impact on message delivery and because bindings can take time to propagate through the cluster there is the possibility of message loss.
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

Moving onto testing against a 3 node cluster the performance results were very similar to those above and didn't change notably as the number of bindings rose (so I haven't included them here). This was with the producers and consumers connecting via a front side load balancing proxy which resulted in the ten producers and ten consumers being evenly distributed across the nodes. However what was immediately noticeable was a much longer delay between creating the bindings and the first message being delivered to the consumers. With 1000 bindings per queue it took over 5 minutes for the first message to be delivered. Moreover, while the bindings are propagating throughout the cluster there is the possibility of message loss. In multiple test runs we saw fewer messages consumed than were published. In one example we lost 1121 messages out of 87180 published. However if we waited 10 minutes after creating the 10,000 bindings before we started publishing we saw no message loss whatsoever. 

Below is an example output from the `RmqBindingTest.StatsCollector.exe`, which collects message counts from publishers and consumers as they exit, showing the discrepancy (see the GitHub repo for details on this).
```
PUB:      10461, CON:          0, MSG: PUB|A7|10461
PUB:      21090, CON:          0, MSG: PUB|A6|10629
PUB:      31842, CON:          0, MSG: PUB|A5|10752
PUB:      42701, CON:          0, MSG: PUB|A4|10859
PUB:      53663, CON:          0, MSG: PUB|A3|10962
PUB:      64730, CON:          0, MSG: PUB|A2|11067
PUB:      75904, CON:          0, MSG: PUB|A0|11174
PUB:      87180, CON:          0, MSG: PUB|A1|11276
PUB:      87180, CON:       7992, MSG: CON|A9|7992
PUB:      87180, CON:      15992, MSG: CON|A8|8000
PUB:      87180, CON:      23992, MSG: CON|A7|8000
PUB:      87180, CON:      31992, MSG: CON|A5|8000
PUB:      87180, CON:      39992, MSG: CON|A4|8000
PUB:      87180, CON:      47992, MSG: CON|A3|8000
PUB:      87180, CON:      55992, MSG: CON|A2|8000
PUB:      87180, CON:      64512, MSG: CON|A1|8520
PUB:      87180, CON:      78059, MSG: CON|A0|13547
PUB:      87180, CON:      86059, MSG: CON|A6|8000
```

It seems that the prime performance bottleneck is the time it takes for the Erlang infrastructure to distribute the bindings to the cluster. It suggests that if one is going to create large numbers of bindings on a RabbitMQ cluster that one needs to be very aware of "binding churn", the rate at which the bindings are created and removed because this can have a major impact on message delivery. Be aware that, just because you have declared the binding against the cluster, it might not be ready to route a message until some time later.