const protobuf = require("protobufjs")
const util = require('util')
const fs = require("fs")
const os = require("os")
const path = require("path")

async function encodeRequest(context) {
  let config = JSON.parse(await context.store.getItem("protobuf_" + context.request.getId()))

  if (!config) { return }
  if (!config.reqProtoPath || !config.reqProtoType) { return }

  const root = await protobuf.load(config.reqProtoPath)
  const Message = root.lookupType(config.reqProtoType)

  if (Message && context.request.getHeader("Content-Type") == "application/json") {
    const body = JSON.parse(context.request.getBody().text)
    const errMsg = Message.verify(body)
    if (errMsg) { throw Error(errMsg) }
    const message = Message.create(body)
    const serialized = Message.encode(message).finish()
    let filePath = writeAsTmpFile(serialized)

    context.request.setBody({ fileName: filePath })
    context.request.setHeader("content-type", config.contentType)
  } else {
    throw Error("Message type not found or content-type not application/json (only supported)")
  }
}

async function decodeResponse(context) {
  let config = JSON.parse(await context.store.getItem("protobuf_" + context.response.getRequestId()))

  if (context.response.getHeader("content-type") != config.contentType) { return }
  if (!config) { return }
  if (!config.resProtoPath || !config.resProtoType) { return }

  const root = await protobuf.load(config.resProtoPath)
  const Message = root.lookupType(config.resProtoType)

  if (Message) {
    const body = context.response.getBody()
    const deserialized = Message.decode(body)
    context.response.setBody(JSON.stringify(deserialized))
  }
}

function writeAsTmpFile(buffer) {
  let tmp = os.tmpdir()
  let base = path.join(tmp, "insomnia-proto")

  if (!fs.existsSync(base)) {
    fs.mkdirSync(base)
  }

  let filePath = path.join(
    base,
    String(Math.floor(Math.random() * 3000000000))
  )

  fs.writeFileSync(filePath, buffer)

  return filePath
}

module.exports.templateTags = [
  {
    name: 'proto',
    displayName: 'Protobuf Config',
    description: 'Set proto files for request and response bodies',
    args: [
      {
        displayName: "Request Proto",
        description: "The request .proto file",
        type: 'file',
      },
      {
        displayName: args => "Type",
        type: 'string',
      },
      {
        displayName: "Response Proto",
        description: "The response .proto file",
        type: 'file',
      },
      {
        displayName: args => "Type",
        type: 'string',
      },
      {
        displayName: args => "content-type (used in requests and responses)",
        type: 'string',
        placeholder: "application/x-protobuf",
        defaultValue: "application/x-protobuf"
      },
    ],
    async run(context, reqProtoPath, reqProtoType, resProtoPath, resProtoType, contentType) {
      const config = {
        reqProtoPath,
        reqProtoType,
        resProtoPath,
        resProtoType,
        contentType
      }

      await context.store.setItem("protobuf_" + context.meta.requestId, JSON.stringify(config))

      return "Config valid"
    }
  }
]

module.exports.requestHooks = [encodeRequest]
module.exports.responseHooks = [decodeResponse]
