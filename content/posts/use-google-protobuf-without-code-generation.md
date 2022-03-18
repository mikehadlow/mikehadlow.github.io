---
title: "How to use Google.Protobuf without code generation in C#"
date: 2022-03-18
draft: false
author: Mike Hadlow
---
The [`Google.Protobuf`](https://www.nuget.org/packages/Google.Protobuf/) NuGet package is the recommended [protobuf](https://developers.google.com/protocol-buffers) serializer for .NET. The documented way of using it is to code gen both C# models and serializers from `.proto` files using the `protoc` tool. However, sometimes it's more convenient to do serialization/deserialization on an ad-hoc basis without code generation. The `Google.Protobuf` NuGet package provides APIs to do this, but they are poorly documented. This post gives a code example for a simple "no-code-gen" serializer.
<!--more-->
Protocol Buffers, to give protobuf its full name, is a simple efficient binary format for serializing messages. The structure is relatively simple and described in this single page, [Encoding](https://developers.google.com/protocol-buffers/docs/encoding), in the protobuf documentation. 

The message structures are defined in `.proto` files. Here's a very simple example:
```protobuf
syntax = "proto3";

message Example {
  string name = 1;
  int32 age = 3;
  int64 stars_in_galaxy = 5;
}
```
As you can  see, each property/field of a message has three parts, a type (`string`), a name (`name`), and a tag number, (`1`). This is serialized to a byte array as a series of tag and value pairs (much simplified):

| tag | value | tag | value | tag | value |
|---|---|---|---|---|---|
| 1 : delimited | "value" | 3 : varint | 456 | 5 : varint | 345567 |

The interesting thing to note is that there is no message identifier and the property/field names are not present in the serialized value. In fact they are only used by the code generator tool, `protoc`, for generating the model DTOs in the specified language. The serializer doesn't need to know about them. In order to serialize or deserialize  a message the serializer just needs to know the tag number, type, and value of each field.

The `Google.Protobuf` NuGet package provides two useful types, `CodedInputStream` and `CodedOutputStream` which makes reading and writing protobuf messages pretty simple. I've created a simple demonstration serializer using these two classes that can serialize and deserialize simple messages. Here's an example of it in use:
```csharp
// Given Example.proto, create a new Serializer instance
// passing in a dictionary listing the field tags and types.
var serializer = new Serializer(new Dictionary<uint, Type> 
{ 
    [1] = typeof(string),
    [3] = typeof(int),
    [5] = typeof(long),
});

// Create a new ad-hoc message, specifying tags and values.
var example = new Dictionary<uint, object>
{
    [1] = "Superman",
    [3] = 570,
    [5] = long.MaxValue
};

// use the no-code-gen serializer to serialize the message to protobuf.
var protobufBytes = serializer.Serialize(example);

// use the no-code-gen serializer to deserialize the protobuf message.
var result = serializer.Deserialize(protobufBytes);

WriteLine($"result.Count = {result.Count}");
WriteLine($"result[1] = {result[1]}");
WriteLine($"result[3] = {result[3]}");
WriteLine($"result[5] = {result[5]}");
```
Notice that the `Serializer` is constructed with a simple dictionary of tag numbers and types. This tells the serializer the structure of the expected message. The message for serialization is another simple dictionary, this time of tag numbers and values. In the example above we serialize a message to a byte array then deserialize it. The deserialized value is another tag and value dictionary.

__Important Health Warning!__ This demo serializer is "the simplest thing that could work" for this simple example. It is _not_ a fully featured protobuf serializer and has the following limitations:
1. Tags can only have the maximum value of 31 (because it only supports single byte tags)
2. Only int, long, and string are supported.
3. No arrays or sub-types are supported.
4. It is not optimized in any way and does a _lot_ of boxing and unboxing of message values.

With that said, here is the full code listing for the `Serializer` class. The full demo is also on [GitHub here](https://github.com/mikehadlow/ProtobufSerializer).

```csharp
using Google.Protobuf;

namespace ProtobufSerializer;

/// <summary>
/// Very simple no-code-gen protobuf serializer.
/// 
/// Has many limitations!
/// 1. Tags must be maximum 31 (because we only support single byte tags).
/// 2. Only int, long, and string currently supported.
/// 3. No arrays or sub types supported.
/// </summary>
public class Serializer
{
    private readonly IDictionary<uint, Type> messageDefinition;
    private readonly HashSet<uint> fieldSet;

    public Serializer(IDictionary<uint, Type> messageDefinition)
    {
        this.messageDefinition = messageDefinition;
        fieldSet = new HashSet<uint>(messageDefinition.Keys);
    }

    public byte[] Serialize(IDictionary<uint, object> value)
    {
        var valueFieldSet = new HashSet<uint>(value.Keys);
        if(fieldSet.Except(valueFieldSet).Any())
        {
            throw new ArgumentException("Input value key set differs from messageDefinition.");
        }

        var bytes = new byte[CalculateMessageSize(value)];
        var output = new CodedOutputStream(bytes);

        foreach(var (key, input) in value)
        {
            output.WriteRawTag(CreateTag(key));
            switch (messageDefinition[key])
            {
                case Type t when t == typeof(int):
                    output.WriteInt32((int)(input ?? 0));
                    break;
                case Type t when t == typeof(long):
                    output.WriteInt64((long)(input ?? 0));
                    break;
                case Type t when t == typeof(string):
                    output.WriteString((string)(input ?? ""));
                    break;
                default:
                    throw new InvalidOperationException($"Invalid type.");
            }
        }
        output.CheckNoSpaceLeft();
        return bytes;

        int CalculateMessageSize(IDictionary<uint, object> value)
        {
            var size = 0;
            foreach(var (key, input) in value)
            {
                size += 1 + messageDefinition[key] switch
                {
                    Type t when t == typeof(int) =>  CodedOutputStream.ComputeInt32Size((int)(input ?? 0)),
                    Type t when t == typeof(long) =>  CodedOutputStream.ComputeInt64Size((long)(input ?? 0)),
                    Type t when t == typeof(string) =>  CodedOutputStream.ComputeStringSize((string)(input ?? "")),
                    Type t => throw new InvalidOperationException($"Unsupported type {t.Name}")
                };
            }
            return size;
        }

        // tag byte format is AAAAA_BBB where A bits are the tag number and B bits are the wire type.
        byte CreateTag(uint key)
        {
            uint wiretype = messageDefinition[key] switch 
            { 
                Type t when t == typeof(int) => 0,
                Type t when t == typeof(long) => 0,
                Type t when t == typeof(string) => 2, // delimited
                Type t => throw new InvalidOperationException($"Unsupported type {t.Name}")
            };

            return BitConverter.GetBytes((key << 3) + wiretype)[0];
        }
    }

    public IDictionary<uint, object> Deserialize(byte[] bytes)
    {
        using var input = new CodedInputStream(bytes);
        var value = new Dictionary<uint, object>();

        uint tag;
        while((tag = input.ReadTag()) != 0)
        {
            var field = tag >> 3;

            if(!messageDefinition.ContainsKey(field))
            {
                throw new InvalidOperationException($"Unexpected field value: {field}");
            }

            switch (messageDefinition[field])
            {
                case Type t when t == typeof(int):
                    value.Add(field, input.ReadInt32());
                    break;
                case Type t when t == typeof(long):
                    value.Add(field, input.ReadInt64());
                    break;
                case Type t when t == typeof(string):
                    value.Add(field, input.ReadString());
                    break;
                default:
                    throw new InvalidOperationException($"Invalid type.");
            }
        }

        return value;
    }
}

```