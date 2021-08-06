const protobuf = require("protobufjs")
const util = require('util')
const path = require('path');
const fs = require('fs');

const _protos = {}

async function decodeResponse(context) {
  let protoDescriptor = _protos[context.request.getId()]

  // if (!protoDescriptor) {
  //   protoDescriptor = await context.store.getItem(`proto.${context.request.getId()}`)
  //   if (!protoDescriptor) {
  //       console.log("[protobuf]: Skipping... request has no proto descriptor")
  //       return
  //   } else {
  //     _cache[context.request.getId()] = protoDescriptor
  //   }
  // }

  const protoDir = await context.request.getEnvironmentVariable("PROTO_DIR")
  if (!protoDir) {
      console.log("[proto]: Skipping... no [PROTO_DIR] present in environment")
      return
  }

  protoDescriptor = { file: "SyncCatalog.proto", type: "SyncCatalogProto" }

  const Proto = await protobuf.load(protoDir + protoDescriptor.file)
  const Type = Proto.lookupType(protoDescriptor.type)
  _protos[context.request.getId()] = Type

  console.log(_protos[context.request.getId()])
  const body = context.response.getBody()
  const proto = Type.decode(body)
  console.log(util.inspect(proto))
  
  context.response.setBody(util.inspect(proto))
}

module.exports.requestHooks = []
module.exports.responseHooks = [decodeResponse]

let files
let types = []

function arrayContains(array, value) {
  if (!Array.isArray(array)) { return false }

  return array.includes(value)
}

module.exports.templateTags = [
  {
    name: 'proto',
    displayName: 'Protobuf',
    description: 'Set Protobuf Type',
    args: [
      {
        displayName: 'Request',
        type: 'model',
        model: 'Request',
      },
      {
        type: 'string',
        displayName: args => "File - " + (arrayContains(files, args[1].value) ? "valid" : "invalid")
      },
      {
        type: 'string',
        displayName: args => "Type - " + (arrayContains(types, args[2].value) ? "valid" : "invalid")
      },
    ],
    async run(context, reqId, file, type) {
      console.log(context)
      if (!context.context.PROTO_PATH) {
        return "No [PROTO_PATH] present in environment"
      }

      if (!files) {
        files = fs.readdirSync(context.context.PROTO_PATH).filter(file => file.endsWith(".proto"))
      }
    
      if (arrayContains(files, file)) {
        if (arrayContains(types, type)) {
          context.store.setItem(reqId, _protos[file].lookupType(type))
          return util.inspect({ file: file, type: type })
        }

        if (file in _protos === false) {
          _protos[file] = await protobuf.load(path.join(context.context.PROTO_PATH, file))
        }

        types = Object.keys(_protos[file].nested)

        return "Found types:\n" + types
      } else {
        types = undefined
      }

      return "Found files:\n" + files
    }
  }
];
