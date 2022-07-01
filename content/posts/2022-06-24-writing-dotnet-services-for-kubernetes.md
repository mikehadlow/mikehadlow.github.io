---
title: "Writing .NET Application Services for Kubernetes"
date: 2022-06-24
draft: false
author: Mike Hadlow
---
In a traditional .NET distributed application, application services (not to be confused with the Kubernetes 'service' object) would either be written as IIS hosted web applications or Windows Services. When building .NET (micro)services to be deployed in a [Kubernetes](https://kubernetes.io/) cluster pretty much every facet of the service needs to be reconsidered, not only the hosting environment but the way configuration is accessed, how logging and monitoring work, and the options for state management and memory considerations. In this post I'll bring my experience of migrating .NET applications to Kubernetes to enumerate some of the main ways that you'll need to change the way you write them.
<!--more-->
First some caveats. I don't intend this post to be an introduction to Kubernetes, or a justification of why you should use Kubernetes. Nor is it a tutorial on how to write distributed applications or .NET application services. It's intended audience is my past self about a year and a half ago. I would have very much appreciated a short guide on the changes I would have to make to redesign my .NET application services to take full advantage of Kubernetes.

I've created a minimal example service [NetOnKubernetes](https://github.com/mikehadlow/NetOnKubernetes) that I've shared on GitHub that implements the recommendations below. Please feel free to use it as a starting point for your own application services.

### Application Service Design

Some general application design guidelines:

* Build stateless horizontally scalable services. See the [12 factor apps](https://12factor.net/) guidelines.
* Use Linux containers. .NET is now cross platform and runs well on Linux. Avoid the bloat and inevitable friction of Windows Containers.
* Consider the container immutable. Do not change the local file system. If you need a file system, use a volume mount.
* One container per pod. Although the [sidecar pattern](https://learnk8s.io/sidecar-containers-patterns) is a popular one, it's perfectly reasonable to have a complete distributed application without a single sidecar in sight. Like all popular patterns, only use it if you have a real need.
* Every application is a console application. Processes are managed by Kubernetes. HTTP services should be standalone console based web apps using the Kestrel webserver.

One of the main advantages you'll find writing application services for Kubernetes is that the platform now provides many things that you would previously have had to include in your application. As I'll describe below things such as configuration, logging, metrics, and security all become simpler to implement.

### Building your container images

Kubernetes is primarily a container orchestration framework. Your applications/services need to be built and deployed as (usually Docker) containers. Microsoft have published a very good guide to building and running containerized .NET applications, [NET Microservices Architecture for Containerized .NET Applications](https://dotnet.microsoft.com/en-us/download/e-book/microservices-architecture/pdf) that I'd recommend reading, although it doesn't cover Kubernetes the advice on creating container images and microservice architecture is very good.

Although it's possible to compile your application in a traditional build server and then create the runtime container image from the compiled binaries, it's easier to combine the build and runtime in a single multi-stage docker file, that way you control the environment for both build and deployment. Here is a very simple example:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:6.0-bullseye-slim AS runtime
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:6.0-bullseye-slim AS sdk

ARG build_number=1.0.0

WORKDIR /app

COPY src/ .

# restore nuget packages
RUN dotnet restore

# build
RUN dotnet build --no-restore "-p:Version=${build_number}"

# test
RUN dotnet test --no-build GreetingService.Tests/GreetingService.Tests.csproj

# publish
RUN dotnet publish --no-build -o output

# create runtime image
FROM runtime AS final
WORKDIR /app
COPY --from=sdk /app/output/ ./
ENTRYPOINT ["./GreetingsService"]
```

As you can see there are multiple `FROM` clauses. Each one discards the previous image so the final `final` image is small.

Note, it's quite common to see just the .csproj file copied first for the restore phase, then the rest of the `src` contents copied for the build. This will give you smaller, more efficient, layer cacheing. Although if you are using an ephemeral build server such as GitHub Actions, there's probably little to be gained. Personally I like to keep things simple.

Build the image with docker build:

```cmd
> docker build -t greetings-service:0.0.1 --build-args build_number=1.0.0 .
```

Once your container images are built, you should publish them to your internal image repository. GitHub provides a container registry as does Azure and all other cloud providers.

### Deploying to Kubernetes

In the simplest case for an aspnet service you can deploy your application/service to Kubernetes by simply running a deployment specifying your image and the number of replicas you want:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greetings-service-deployment
  labels:
    app: greetings-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: greetings-service
  template:
    metadata:
      labels:
        app: greetings-service
    spec:
      containers:
      - name: greetings-service
        image: greetings-service:0.0.1
```

You will also need a Kubernetes "service" to direct traffic to your pods, something like:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: greetings-service-service
spec:
  selector:
    app: greetings-service
  ports:
  - name: greetings-service-service-port
    protocol: TCP
    port: 3456
    targetPort: 5432
    nodePort: 30001
  type: LoadBalancer
```

Use `kubectl apply` to run the deployment:

```cmd
> kubectl apply -f greetings-service-deployment.yaml
```

Consider using [Helm](https://helm.sh/) to template your deployments for any but the very simplest cases. I've also had [Kustomize](https://kustomize.io/) recommended to me, which looks a little simpler than Helm, but I've not used it myself.

### Build and Deployment

Your build and deploy pipeline will look something like this:

1. `docker build .` Build your service container image.
2. `docker push ...` Push your image to your image repository.
3. `kubectl apply ...` Execute the YAML file defining your deployment against your Kubernetes cluster.

If you are using [GitHub](https://github.com/) for source control [GitHub actions](https://github.com/features/actions) are a good choice for running these steps on a successful commit or pull request merge.

### Source Control

One of the great advantages of Kubernetes is that it enables source controlled immutable infrastructure. Your application is no longer deployed with a build pipeline and environment subject to arbitrary imperative commands or GUI clicks by a sysadmin. Instead we should treat the Dockerfile, Kubernetes object YAML files, and build pipeline scripts as the source of truth ("Filesystems as the Source of Truth"). Any changes to the infrastructure should only be enacted by modifying and committing these files. This enables a fully visible and audited history of infrastructure changes.

My personal preference is to store the Dockerfile, Kubernetes object YAML files, and build pipeline script in the same repo as the service/application source code.

### Application Lifecycle

It's general good advice to make your application easily disposable, with fast startup and graceful shutdown. If your application does this and fails fast when it encounters a problem, then you're good to go. Only use the various hooks Kubernetes provides that I describe below if you can't meet these conditions.

It can also be worth adding liveness and/or readiness probes to your application. These are HTTP endpoints that Kubernetes can query to ascertain the state of your application. If your application needs to restart, it's best to simply fail fast and let Kubernetes restart the container, but if that is impractical for some reason you can return an HTTP failure code (500) from your liveness endpoint and Kubernetes will restart the container for you. Readiness probes are probably the most useful. They signal to Kubernetes that your application is ready to receive requests. This means that traffic will not be routed to the container until Kubernetes sees a 200 response. Very useful if your application has a long startup time.

Here is an example of liveness and readiness endpoints:

```csharp
// liveness probe, return HTTP status code 500 if you want the container to be restarted
app.MapGet("/live", () => Results.Ok());
// rediness probe, return 200 OK when the application is ready to respond to requests.
// this can turn on and off if necessary, for example if a backend service is not available.
app.MapGet("/ready", () => hasStarted ? Results.Ok() : Results.StatusCode(500));
```

Configure them in your deployment YAML like this:

```yaml
    spec:
      containers:
      - name: greetings-service
        image: greetings-service:0.0.3
        livenessProbe:
          httpGet:
            path: /live
            port: 5432
        readinessProbe:
          httpGet:
            path: /ready
            port: 5432
```

Kubernetes can also notify your container of startup and (more usefully) shutdown with the use use of [Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/). You provide HTTP endpoints for the Kubernetes `PostStart` and `PreStop` events. Kubernetes won't kill the container until the `PreStop` event completes, so it's a good opportunity to gracefully shutdown:

```csharp
// PostStart and PreStop event hooks.
app.MapGet("/postStart", (ILogger<GreetingApp> logger) 
    => logger.LogInformation("PostStart event"));
app.MapGet("/preStop", (ILogger<GreetingApp> logger) 
    => logger.LogInformation("PreStop event"));
```

Configure them in the deployment YAML file like this:

```yaml
    spec:
      containers:
      - name: greetings-service
        image: greetings-service:0.0.3
        lifecycle:
          postStart:
            httpGet:
              path: /postStart
              port: 5432          
          preStop:
            httpGet:
              path: /preStop
              port: 5432          
```

### Memory and CPU Limits

It's important to set resource quotas for your container so that Kubernetes can correctly schedule your pod to a node. This means configuring resource limits and requests in your deployment YAML. Unless you've got a particular problem you want to solve, it's easiest and simplest just to set the limits and requests to the same values. If you don't set limits and requests, Kubernetes will gives your pod a _best effort_ quality of service which give no guarantee that it wont be evicted when node resources are short. Setting limits and requests gives you _guaranteed_ QoS. Be conservative with the values you choose. Your pod will be throttled if it exceeds its CPU limits, and restarted if it exceeds its memory limits.

```yaml
    spec:
      containers:
      - name: greetings-service
        image: greetings-service:0.0.3
        resources:
          limits:
            memory: 200Mi
            cpu: 100m
          requests:
            memory: 200Mi
            cpu: 100m
```

### Configuration

Configuration here means everything that is different for deploying in different environments (e.g. development, QA, staging, production). A single container image should be deployable to any environment without modification. The easiest way to manage configuration in a Kubernetes deployed app is via environment variables. These also have the advantage of being language and OS-agnostic.

Environment variables can be configured using a Kubernetes [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/). Here is a simple example which defines two values:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: greetings-service
data:
  GREETINGS_MESSAGE: "Hello World From Config Map!"
  GREETINGs_NUMBER: "1234"
```

Apply the ConfigMap's values to a pod in the deployment YAML using `envFrom` in the pod spec. This will apply all the `data` values from the ConfigMap as environment variables to the pod.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greetings-service-deployment
  labels:
    app: greetings-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: greetings-service
  template:
    metadata:
      labels:
        app: greetings-service
    spec:
      containers:
      - name: greetings-service
        image: greetings-service:0.0.3
        envFrom:
        - configMapRef:
            name: greetings-service
```

ASPNET has very convenient build-in support to access environment variables. The default builder includes an environment variable configuration provider, so accessing an environment variable is simply a case of using a string indexer on `IConfiguration`:

```csharp
app.MapGet("/", (IConfiguration configuration) => 
{
    var message = configuration["GREETINGS_MESSAGE"] 
        ?? "Hello World! env var not found.";
    return new Greeting(message);
});
```

For sensitive values, consider using a Kubernetes [Secret](https://kubernetes.io/docs/concepts/configuration/secret/). These are configured differently in Kubernetes, but as with a ConfigMap they are applied to the pod environment and accessed as environment variables by the application. Note that the default Kubernetes configuration is not very secure and you should configure encryption at rest in etcd and enable TLS/SSL between etcd and your pods. Also beware of who has access to etcd. It's also recommended to take advantage of your cloud providers' secrets provider if it has one.

### Logging

The Kubernetes way is have your application/service log to stdout and have a log collector/processor on each node (deployed as a [daemonset](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)) collect and forward the logs to an aggregator. A popular combination is [Fluent Bit](https://github.com/fluent/fluent-bit) and [Fluentd](https://github.com/fluent/fluentd) nicely described in this blog post, [Fluentd vs. Fluent Bit: Side by Side Comparison](https://logz.io/blog/fluentd-vs-fluent-bit/)

It's best practice to log event-per-output-line in a structured format such as JSON that the log collector can understand and parse. Configure your service to log event-per-line JSON like this:

```csharp
var builder = WebApplication.CreateBuilder();
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options => 
{ 
    options.IncludeScopes = false;
    options.TimestampFormat = "yyyy:MM:dd hh:mm:ss ";
    options.JsonWriterOptions = new JsonWriterOptions
    {
        // sometimes useful to change this to true when testing locally.
        // but it needs to be false for Fluent Bit to 
        // process log lines correctly
        Indented = false 
    };
});
```

See [Console Log Formatting](https://docs.microsoft.com/en-gb/dotnet/core/extensions/console-log-formatter) and the [discussion around adding formatted JSON logs in .NET 5.0](https://github.com/dotnet/runtime/issues/34742)

Having said all this, it's worth pointing out that a new, cross vendor, emerging standard for all your tracing, metrics, and logging needs is [OpenTelemetry](https://opentelemetry.io/). Microsoft are [committed to supporting it](https://devblogs.microsoft.com/dotnet/opentelemetry-net-reaches-v1-0/) which means that the good news is changing your service to export OTel logs should be just a question adding a new logging provider. You can check the current status of OTel on their [status page](https://opentelemetry.io/status/). When OTel is ready for production it'll be a case of installing the OTel collector on your Kubernetes cluster and configuring it to communicate with your logging and monitoring tools. See the OTel documentation for more information on this.

### Metrics

The [CNCF](https://www.cncf.io/) supported standard for metrics collection is [Prometheus](https://prometheus.io/), usually coupled with [Grafana](https://grafana.com/oss/grafana/) to provide dashboards and visualizations. Prometheus is a "pull based" metric collector, which means that your application provides an HTTP endpoint for Prometheus to query. Service discovery is provided by Kubernetes, so it's simply a question of adding some annotations to the application's deployment YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greetings-service-deployment
  labels:
    app: greetings-service
  annotations:
    prometheus.io/port: '5432'
    prometheus.io/scrape: 'true'
...
```

A Prometheus client library is available for .NET, [prometheus-net](https://github.com/prometheus-net/prometheus-net). Simply add the NuGet package to your application and add the metrics endpoint:

```csharp
var app = builder.Build();
app.UseRouting();
app.UseEndpoints(endpoints => 
{
    endpoints.MapMetrics();
});
```

Now when you navigate to `/metrics` you will see a range of out-of-the-box metrics that the library provides:

```bash
# HELP dotnet_total_memory_bytes Total known allocated memory
# TYPE dotnet_total_memory_bytes gauge
dotnet_total_memory_bytes 3979792
# HELP process_working_set_bytes Process working set
# TYPE process_working_set_bytes gauge
process_working_set_bytes 57937920
# HELP process_private_memory_bytes Process private memory size
# TYPE process_private_memory_bytes gauge
process_private_memory_bytes 45125632
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 1.421875
# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1655909436.368272
# HELP process_open_handles Number of open handles
# TYPE process_open_handles gauge
process_open_handles 662
# HELP process_num_threads Total number of threads
# TYPE process_num_threads gauge
process_num_threads 23
# HELP process_virtual_memory_bytes Virtual memory size in bytes.
# TYPE process_virtual_memory_bytes gauge
process_virtual_memory_bytes 2208994299904
# HELP dotnet_collection_count_total GC collection count
# TYPE dotnet_collection_count_total counter
dotnet_collection_count_total{generation="1"} 0
dotnet_collection_count_total{generation="2"} 0
dotnet_collection_count_total{generation="0"} 0
```

You can add your own counters and meters using the library. See the documentation for more details.

Note that metrics will also be provided by OpenTelemetry (see logging above), so by the time you read this OpenTelemetry might well be the best option for metrics as well.

### Security

The debate on Security in Kubernetes is often confused between securing the Kubernetes cluster itself - authenticating and authorising access to the Kubernetes API for developers and administrators working on the cluster, and "userland" security for the application hosted on the cluster - authenticating and authorising users of the application, such a customer wanting to buy something on your eCommerce site. Because of this confusion it's quite frustrating trying to Google for solutions and approaches to application security. Having said all that, here are my thoughts on _application security_.

If you are building any modern HTTP serving application a prerequisite is that you only serve HTTPS over the internet. It's also true that the vast majority of business applications also require some kind of authentication and authorisation. Regardless of whether you are using Kubernetes or not, any distributed application should use Single Sign On (SSO) with a separate Identity Provider (IdP). The prevalent protocol for this is OAuth. For Role Based Access Control (RBAC) individual services need to be able to see claims (user roles and other attributes) passed by the OAuth token, but they don't necessarily need to do the actual token decryption.

There seem to be two schools of thought on application security in Kubernetes. On one hand are those who suggest that everything in your Kubernetes cluster should be considered trusted and to do things like HTTPS termination and token decryption on ingress. This allows your application services to be simple HTTP servers that don't need to include components for these tasks. One of the main benefits of an application platform is the ability to offload various infrastructure concerns to the platform.

On the other hand, many people suggest adopting a zero trust approach within the Kubernetes cluster. There are obviously security verses complexity trade-offs on both sides of this debate. Which side you fall on will depend very much on the nature of your application and business.

With the former approach, you build your services to serve plain unencrypted HTTP, do HTTPS termination and authentication on your ingress reverse proxy. For authentication use an authentication reverse proxy on ingress that can be shared by all your services. This post is very good on authentication proxies. It doesn't mention Kubernetes, but the principle is the same. [Authentication for multiple apps behind a reverse proxy](http://morganridel.fr/authentication-for-multiple-apps-behind-a-reverse-proxy) Another good read is [Authenticating API Clients with JWT and NGINX Plus](https://www.nginx.com/blog/authenticating-api-clients-jwt-nginx-plus/), which covers how to do this in detail with the commercial edition of Nginx. If your internal services need to know about internal services or roles etc, the proxy can translate JWT claims into HTTP headers.

A third, middle way, might be to create a sidecar that can do HTTPS termination and token decryption. Your application can then still be built simply as a pure HTTP service, but external the pod everything is TLS encrypted. Of course it means that you would have to deploy the sidecar alongside every service with the attendant cost and complexity.

-----------------------------

Comment on this post on [Reddit](https://www.reddit.com/r/programming/comments/vp48u9/writing_net_application_services_for_kubernetes/)
