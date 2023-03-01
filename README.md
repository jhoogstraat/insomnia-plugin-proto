# Insomnia Protobuf
Use protobuffers in your request and response bodies.

## How-to
1) set to body type to `JSON`
1) Select `Toggle Description` and add the `Protobuf Config` template to the `Content-Type` headers description (see example below)
3) Set the request/response `.proto` files and types (one or both)

## Tips
- See [protobufjs](https://www.npmjs.com/package/protobufjs#using-proto-files) for details on the conversion from json to protobuf
- The request `Content-Type` will automatically be replaced with the configured content-type.
- The response `Content-Type` must match the configured content-type for the plugin to convert the response body back to json

## Example
![Header Setup](header_howto.png)