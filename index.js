const protobuf = require("protobufjs")
const util = require('util')
const fs = require("fs")
const os = require("os")
const path = require("path")

async function encodeRequest(context) {
  context.request.removeHeader("x-proto-disabled")

  let proto = JSON.parse(context.request.getHeader("x-use-proto"))
  
  if (!proto) { return }
  if (!proto.reqProtoPath || !proto.reqProtoType) { return }

  const root = await protobuf.load(proto.reqProtoPath)
  const Message = root.lookupType(proto.reqProtoType)

  if (Message && context.request.getHeader("Content-Type") == "application/json") {
    const body = JSON.parse(context.request.getBody().text)
    const errMsg = Message.verify(body)
    if (errMsg) { throw Error(errMsg) }
    const message = Message.create(body)
    const serialized = Message.encode(message).finish()
    let filePath = writeAsTmpFile(serialized)

    context.request.setBody({ fileName: filePath })
    context.request.setHeader("content-type", proto.contentType)
    context.request.removeHeader("x-use-proto")
  } else {
    throw Error("Message type not found or content-type not application/json (only supported)")
  }
}

async function decodeResponse(context) {
  let proto = JSON.parse(context.request.getHeader("x-use-proto"))

  if (!proto || context.response.getHeader("content-type") != proto.contentType) { return }
  if (!proto.resProtoPath || !proto.resProtoType) { return }

  const root = await protobuf.load(proto.resProtoPath)
  const Message = root.lookupType(proto.resProtoType)

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
    name: 'protoEnable',
    displayName: 'Enable Protobuf',
    description: 'Enable or disable protobuf conversion',
    args: [
      {
        displayName: "Enable Protobuf conversion",
        defaultValue: true,
        type: 'boolean'
      }
    ],
    async run(context, enabled) {
      return enabled ? 'x-use-proto' : 'x-proto-disabled'
    }
  },
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

      const data = {
        reqProtoPath,
        reqProtoType,
        resProtoPath,
        resProtoType,
        contentType
      }

      return JSON.stringify(data)
    }
  }
]

module.exports.requestHooks = [encodeRequest]
module.exports.responseHooks = [decodeResponse]
