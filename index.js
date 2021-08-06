const protobuf = require("protobufjs")
const util = require('util')
const path = require('path');
const fs = require('fs');

const _protos = {}
const _requestToProto = {}

async function decodeResponse(context) {
  const Type = _requestToProto[context.request.getId()]
  console.log(Type, typeof(Type), util.inspect(Type))

  if (Type) {
    const body = context.response.getBody()
    const proto = Type.decode(body)
    context.response.setBody(util.inspect(proto))
  }
}


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
      if (!context.context.PROTO_PATH) {
        return "No [PROTO_PATH] present in environment"
      }

      if (!files) {
        files = fs.readdirSync(context.context.PROTO_PATH).filter(file => file.endsWith(".proto"))
      } 
      
      if (arrayContains(files, file)) {
        if (file in _protos === false) {
          _protos[file] = await protobuf.load(path.join(context.context.PROTO_PATH, file))
        }
        
        types = Object.keys(_protos[file].nested)
      }

      if (arrayContains(files, file) && arrayContains(types, type)) {
        _requestToProto[reqId] = _protos[file].lookupType(type)
        return util.inspect({ file: file, type: type })
      } else {
        _requestToProto[reqId] = null
      }

      return `Files:\n${files}\n\nTypes:\n${types}`
    }
  }
]

module.exports.requestHooks = []
module.exports.responseHooks = [decodeResponse]
