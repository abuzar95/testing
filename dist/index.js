var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// index.ts
import cors from "cors";
import "dotenv/config";
import express2 from "express";

// src/observability/index.ts
var initObservability = () => {
};

// src/routes/chat.route.ts
import express from "express";

// src/controllers/chat-config.controller.ts
import { LLamaCloudFileService } from "llamaindex";
var chatConfig = (_req, res) => __async(void 0, null, function* () {
  let starterQuestions = void 0;
  if (process.env.CONVERSATION_STARTERS && process.env.CONVERSATION_STARTERS.trim()) {
    starterQuestions = process.env.CONVERSATION_STARTERS.trim().split("\n");
  }
  return res.status(200).json({
    starterQuestions
  });
});
var chatLlamaCloudConfig = (_req, res) => __async(void 0, null, function* () {
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    return res.status(500).json({
      error: "env variable LLAMA_CLOUD_API_KEY is required to use LlamaCloud"
    });
  }
  const config = {
    projects: yield LLamaCloudFileService.getAllProjectsWithPipelines(),
    pipeline: {
      pipeline: process.env.LLAMA_CLOUD_INDEX_NAME,
      project: process.env.LLAMA_CLOUD_PROJECT_NAME
    }
  };
  return res.status(200).json(config);
});

// src/controllers/engine/chat.ts
import { ContextChatEngine, Settings } from "llamaindex";

// src/controllers/engine/index.ts
import { VectorStoreIndex } from "llamaindex";
import { storageContextFromDefaults } from "llamaindex/storage/StorageContext";

// src/controllers/engine/shared.ts
var STORAGE_CACHE_DIR = "./cache";

// src/controllers/engine/index.ts
function getDataSource(params) {
  return __async(this, null, function* () {
    const storageContext = yield storageContextFromDefaults({
      persistDir: `${STORAGE_CACHE_DIR}`
    });
    const numberOfDocs = Object.keys(
      storageContext.docStore.toDict()
    ).length;
    if (numberOfDocs === 0) {
      return null;
    }
    return yield VectorStoreIndex.init({
      storageContext
    });
  });
}

// src/controllers/engine/nodePostprocessors.ts
var NodeCitationProcessor = class {
  /**
   * Append node_id into metadata for citation purpose.
   * Config SYSTEM_CITATION_PROMPT in your runtime environment variable to enable this feature.
   */
  postprocessNodes(nodes, query) {
    return __async(this, null, function* () {
      for (const nodeScore of nodes) {
        if (!nodeScore.node || !nodeScore.node.metadata) {
          continue;
        }
        nodeScore.node.metadata["node_id"] = nodeScore.node.id_;
      }
      return nodes;
    });
  }
};
var nodeCitationProcessor = new NodeCitationProcessor();

// src/controllers/engine/queryFilter.ts
function generateFilters(documentIds) {
  const publicDocumentsFilter = {
    key: "private",
    value: "true",
    operator: "!="
  };
  if (!documentIds.length) return { filters: [publicDocumentsFilter] };
  const privateDocumentsFilter = {
    key: "doc_id",
    value: documentIds,
    operator: "in"
  };
  return {
    filters: [publicDocumentsFilter, privateDocumentsFilter],
    condition: "or"
  };
}

// src/controllers/engine/chat.ts
function createChatEngine(documentIds, params) {
  return __async(this, null, function* () {
    const index = yield getDataSource(params);
    if (!index) {
      throw new Error(
        `StorageContext is empty - call 'npm run generate' to generate the storage first`
      );
    }
    const retriever = index.asRetriever({
      similarityTopK: process.env.TOP_K ? parseInt(process.env.TOP_K) : void 0,
      filters: generateFilters(documentIds || [])
    });
    const systemPrompt = process.env.SYSTEM_PROMPT;
    const citationPrompt = process.env.SYSTEM_CITATION_PROMPT;
    const prompt = [systemPrompt, citationPrompt].filter((p) => p).join("\n") || void 0;
    const nodePostprocessors = citationPrompt ? [nodeCitationProcessor] : void 0;
    return new ContextChatEngine({
      chatModel: Settings.llm,
      retriever,
      systemPrompt: prompt,
      nodePostprocessors
    });
  });
}

// src/controllers/chat-request.controller.ts
var convertMessageContent = (textMessage, imageUrl) => {
  if (!imageUrl) return textMessage;
  return [
    {
      type: "text",
      text: textMessage
    },
    {
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    }
  ];
};
var chatRequest = (req, res) => __async(void 0, null, function* () {
  try {
    const { messages, data } = req.body;
    const userMessage = messages.pop();
    if (!messages || !userMessage || userMessage.role !== "user") {
      return res.status(400).json({
        error: "messages are required in the request body and the last message must be from the user"
      });
    }
    const userMessageContent = convertMessageContent(
      userMessage.content,
      data == null ? void 0 : data.imageUrl
    );
    const chatEngine = yield createChatEngine();
    const response = yield chatEngine.chat({
      message: userMessageContent,
      chatHistory: messages
    });
    const result = {
      role: "assistant",
      content: response.response
    };
    return res.status(200).json({
      result
    });
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return res.status(500).json({
      detail: error.message
    });
  }
});

// src/controllers/llamaindex/documents/upload.ts
import { LLamaCloudFileService as LLamaCloudFileService2 } from "llamaindex";
import { LlamaCloudIndex } from "llamaindex/cloud/LlamaCloudIndex";

// src/controllers/llamaindex/documents/helper.ts
import fs from "fs";

// src/controllers/engine/loader.ts
import { FILE_EXT_TO_READER, SimpleDirectoryReader } from "llamaindex/readers/SimpleDirectoryReader";
var DATA_DIR = "./data";
function getExtractors() {
  return FILE_EXT_TO_READER;
}

// src/controllers/llamaindex/documents/helper.ts
var MIME_TYPE_TO_EXT = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};
var UPLOADED_FOLDER = "output/uploaded";
function storeAndParseFile(filename, fileBuffer, mimeType) {
  return __async(this, null, function* () {
    const documents = yield loadDocuments(fileBuffer, mimeType);
    yield saveDocument(filename, fileBuffer, mimeType);
    for (const document of documents) {
      document.metadata = __spreadProps(__spreadValues({}, document.metadata), {
        file_name: filename,
        private: "true"
        // to separate private uploads from public documents
      });
    }
    return documents;
  });
}
function loadDocuments(fileBuffer, mimeType) {
  return __async(this, null, function* () {
    const extractors = getExtractors();
    const reader = extractors[MIME_TYPE_TO_EXT[mimeType]];
    if (!reader) {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
    console.log(`Processing uploaded document of type: ${mimeType}`);
    return yield reader.loadDataAsContent(fileBuffer);
  });
}
function saveDocument(filename, fileBuffer, mimeType) {
  return __async(this, null, function* () {
    const fileExt = MIME_TYPE_TO_EXT[mimeType];
    if (!fileExt) throw new Error(`Unsupported document type: ${mimeType}`);
    const filepath = `${UPLOADED_FOLDER}/${filename}`;
    const fileurl = `${process.env.FILESERVER_URL_PREFIX}/${filepath}`;
    if (!fs.existsSync(UPLOADED_FOLDER)) {
      fs.mkdirSync(UPLOADED_FOLDER, { recursive: true });
    }
    yield fs.promises.writeFile(filepath, fileBuffer);
    console.log(`Saved document file to ${filepath}.
URL: ${fileurl}`);
    return {
      filename,
      filepath,
      fileurl
    };
  });
}

// src/controllers/llamaindex/documents/pipeline.ts
import {
  IngestionPipeline,
  Settings as Settings2,
  SimpleNodeParser
} from "llamaindex";
function runPipeline(currentIndex, documents) {
  return __async(this, null, function* () {
    const pipeline = new IngestionPipeline({
      transformations: [
        new SimpleNodeParser({
          chunkSize: Settings2.chunkSize,
          chunkOverlap: Settings2.chunkOverlap
        }),
        Settings2.embedModel
      ]
    });
    const nodes = yield pipeline.run({ documents });
    yield currentIndex.insertNodes(nodes);
    currentIndex.storageContext.docStore.persist();
    console.log("Added nodes to the vector store.");
    return documents.map((document) => document.id_);
  });
}

// src/controllers/llamaindex/documents/upload.ts
function uploadDocument(index, filename, raw) {
  return __async(this, null, function* () {
    const [header, content] = raw.split(",");
    const mimeType = header.replace("data:", "").replace(";base64", "");
    const fileBuffer = Buffer.from(content, "base64");
    if (index instanceof LlamaCloudIndex) {
      const projectId = yield index.getProjectId();
      const pipelineId = yield index.getPipelineId();
      return [
        yield LLamaCloudFileService2.addFileToPipeline(
          projectId,
          pipelineId,
          new File([fileBuffer], filename, { type: mimeType }),
          { private: "true" }
        )
      ];
    }
    const documents = yield storeAndParseFile(filename, fileBuffer, mimeType);
    return runPipeline(index, documents);
  });
}

// src/controllers/chat-upload.controller.ts
var chatUpload = (req, res) => __async(void 0, null, function* () {
  const {
    filename,
    base64,
    params
  } = req.body;
  if (!base64 || !filename) {
    return res.status(400).json({
      error: "base64 and filename is required in the request body"
    });
  }
  const index = yield getDataSource(params);
  return res.status(200).json(yield uploadDocument(index, filename, base64));
});

// src/controllers/chat.controller.ts
import { StreamData as StreamData2, streamToResponse } from "ai";
import { Settings as Settings4 } from "llamaindex";

// src/controllers/llamaindex/streaming/annotations.ts
function retrieveDocumentIds(annotations) {
  if (!annotations) return [];
  const ids = [];
  for (const annotation of annotations) {
    const { type, data } = getValidAnnotation(annotation);
    if (type === "document_file" && "files" in data && Array.isArray(data.files)) {
      const files = data.files;
      for (const file of files) {
        if (Array.isArray(file.content.value)) {
          for (const id of file.content.value) {
            ids.push(id);
          }
        }
      }
    }
  }
  return ids;
}
function convertMessageContent2(content, annotations) {
  if (!annotations) return content;
  return [
    {
      type: "text",
      text: content
    },
    ...convertAnnotations(annotations)
  ];
}
function convertAnnotations(annotations) {
  const content = [];
  annotations.forEach((annotation) => {
    const { type, data } = getValidAnnotation(annotation);
    if (type === "image" && "url" in data && typeof data.url === "string") {
      content.push({
        type: "image_url",
        image_url: {
          url: data.url
        }
      });
    }
    if (type === "document_file" && "files" in data && Array.isArray(data.files)) {
      const csvFiles = data.files.filter(
        (file) => file.filetype === "csv"
      );
      if (csvFiles && csvFiles.length > 0) {
        const csvContents = csvFiles.map((file) => {
          const fileContent = Array.isArray(file.content.value) ? file.content.value.join("\n") : file.content.value;
          return "```csv\n" + fileContent + "\n```";
        });
        const text = "Use the following CSV content:\n" + csvContents.join("\n\n");
        content.push({
          type: "text",
          text
        });
      }
    }
  });
  return content;
}
function getValidAnnotation(annotation) {
  if (!(annotation && typeof annotation === "object" && "type" in annotation && typeof annotation.type === "string" && "data" in annotation && annotation.data && typeof annotation.data === "object")) {
    throw new Error("Client sent invalid annotation. Missing data and type");
  }
  return { type: annotation.type, data: annotation.data };
}

// src/controllers/llamaindex/streaming/events.ts
import {
  CallbackManager,
  LLamaCloudFileService as LLamaCloudFileService3,
  MetadataMode
} from "llamaindex";
import path2 from "path";

// src/controllers/llamaindex/streaming/file.ts
import fs2 from "fs";
import https from "https";
import path from "path";
function downloadFile(urlToDownload, filename, folder = "output/uploaded") {
  return __async(this, null, function* () {
    try {
      const downloadedPath = path.join(folder, filename);
      if (fs2.existsSync(downloadedPath)) return;
      const file = fs2.createWriteStream(downloadedPath);
      https.get(urlToDownload, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            console.log("File downloaded successfully");
          });
        });
      }).on("error", (err) => {
        fs2.unlink(downloadedPath, () => {
          console.error("Error downloading file:", err);
          throw err;
        });
      });
    } catch (error) {
      throw new Error(`Error downloading file: ${error}`);
    }
  });
}

// src/controllers/llamaindex/streaming/events.ts
var LLAMA_CLOUD_DOWNLOAD_FOLDER = "output/llamacloud";
function appendSourceData(data, sourceNodes) {
  if (!(sourceNodes == null ? void 0 : sourceNodes.length)) return;
  try {
    const nodes = sourceNodes.map((node) => {
      var _a;
      return {
        metadata: node.node.metadata,
        id: node.node.id_,
        score: (_a = node.score) != null ? _a : null,
        url: getNodeUrl(node.node.metadata),
        text: node.node.getContent(MetadataMode.NONE)
      };
    });
    data.appendMessageAnnotation({
      type: "sources",
      data: {
        nodes
      }
    });
  } catch (error) {
    console.error("Error appending source data:", error);
  }
}
function appendEventData(data, title) {
  if (!title) return;
  data.appendMessageAnnotation({
    type: "events",
    data: {
      title
    }
  });
}
function appendToolData(data, toolCall, toolOutput) {
  data.appendMessageAnnotation({
    type: "tools",
    data: {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input
      },
      toolOutput: {
        output: toolOutput.output,
        isError: toolOutput.isError
      }
    }
  });
}
function createStreamTimeout(stream) {
  var _a;
  const timeout = Number((_a = process.env.STREAM_TIMEOUT) != null ? _a : 1e3 * 60 * 5);
  const t = setTimeout(() => {
    appendEventData(stream, `Stream timed out after ${timeout / 1e3} seconds`);
    stream.close();
  }, timeout);
  return t;
}
function createCallbackManager(stream) {
  const callbackManager = new CallbackManager();
  callbackManager.on("retrieve-end", (data) => {
    const { nodes, query } = data.detail;
    appendSourceData(stream, nodes);
    appendEventData(stream, `Retrieving context for query: '${query}'`);
    appendEventData(
      stream,
      `Retrieved ${nodes.length} sources to use as context for the query`
    );
    downloadFilesFromNodes(nodes);
  });
  callbackManager.on("llm-tool-call", (event) => {
    const { name, input } = event.detail.toolCall;
    const inputString = Object.entries(input).map(([key, value]) => `${key}: ${value}`).join(", ");
    appendEventData(
      stream,
      `Using tool: '${name}' with inputs: '${inputString}'`
    );
  });
  callbackManager.on("llm-tool-result", (event) => {
    const { toolCall, toolResult } = event.detail;
    appendToolData(stream, toolCall, toolResult);
  });
  return callbackManager;
}
function getNodeUrl(metadata) {
  if (!process.env.FILESERVER_URL_PREFIX) {
    console.warn(
      "FILESERVER_URL_PREFIX is not set. File URLs will not be generated."
    );
  }
  const fileName = metadata["file_name"];
  if (fileName && process.env.FILESERVER_URL_PREFIX) {
    const pipelineId = metadata["pipeline_id"];
    if (pipelineId) {
      const name = toDownloadedName(pipelineId, fileName);
      return `${process.env.FILESERVER_URL_PREFIX}/${LLAMA_CLOUD_DOWNLOAD_FOLDER}/${name}`;
    }
    const isPrivate = metadata["private"] === "true";
    if (isPrivate) {
      return `${process.env.FILESERVER_URL_PREFIX}/output/uploaded/${fileName}`;
    }
    const filePath = metadata["file_path"];
    const dataDir = path2.resolve(DATA_DIR);
    if (filePath && dataDir) {
      const relativePath = path2.relative(dataDir, filePath);
      return `${process.env.FILESERVER_URL_PREFIX}/data/${relativePath}`;
    }
  }
  return metadata["URL"];
}
function downloadFilesFromNodes(nodes) {
  return __async(this, null, function* () {
    try {
      const files = nodesToLlamaCloudFiles(nodes);
      for (const { pipelineId, fileName, downloadedName } of files) {
        const downloadUrl = yield LLamaCloudFileService3.getFileUrl(
          pipelineId,
          fileName
        );
        if (downloadUrl) {
          yield downloadFile(
            downloadUrl,
            downloadedName,
            LLAMA_CLOUD_DOWNLOAD_FOLDER
          );
        }
      }
    } catch (error) {
      console.error("Error downloading files from nodes:", error);
    }
  });
}
function nodesToLlamaCloudFiles(nodes) {
  const files = [];
  for (const node of nodes) {
    const pipelineId = node.node.metadata["pipeline_id"];
    const fileName = node.node.metadata["file_name"];
    if (!pipelineId || !fileName) continue;
    const isDuplicate = files.some(
      (f) => f.pipelineId === pipelineId && f.fileName === fileName
    );
    if (!isDuplicate) {
      files.push({
        pipelineId,
        fileName,
        downloadedName: toDownloadedName(pipelineId, fileName)
      });
    }
  }
  return files;
}
function toDownloadedName(pipelineId, fileName) {
  return `${pipelineId}$${fileName}`;
}

// src/controllers/llamaindex/streaming/stream.ts
import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  trimStartOfStreamHelper
} from "ai";

// src/controllers/llamaindex/streaming/suggestion.ts
import { Settings as Settings3 } from "llamaindex";
function generateNextQuestions(conversation) {
  return __async(this, null, function* () {
    const llm = Settings3.llm;
    const NEXT_QUESTION_PROMPT = process.env.NEXT_QUESTION_PROMPT;
    if (!NEXT_QUESTION_PROMPT) {
      return [];
    }
    const conversationText = conversation.map((message2) => `${message2.role}: ${message2.content}`).join("\n");
    const message = NEXT_QUESTION_PROMPT.replace(
      "{conversation}",
      conversationText
    );
    try {
      const response = yield llm.complete({ prompt: message });
      const questions = extractQuestions(response.text);
      return questions;
    } catch (error) {
      console.error("Error when generating the next questions: ", error);
      return [];
    }
  });
}
function extractQuestions(text) {
  const contentMatch = text.match(new RegExp("```(.*?)```", "s"));
  const content = contentMatch ? contentMatch[1] : "";
  const questions = content.split("\n").map((question) => question.trim()).filter((question) => question !== "");
  return questions;
}

// src/controllers/llamaindex/streaming/stream.ts
function LlamaIndexStream(response, data, chatHistory, opts) {
  return createParser(response, data, chatHistory).pipeThrough(createCallbacksTransformer(opts == null ? void 0 : opts.callbacks)).pipeThrough(createStreamDataTransformer());
}
function createParser(res, data, chatHistory) {
  const it = res[Symbol.asyncIterator]();
  const trimStartOfStream = trimStartOfStreamHelper();
  let llmTextResponse = "";
  return new ReadableStream({
    pull(controller) {
      return __async(this, null, function* () {
        var _a2;
        const { value, done } = yield it.next();
        if (done) {
          controller.close();
          chatHistory.push({ role: "assistant", content: llmTextResponse });
          const questions = yield generateNextQuestions(chatHistory);
          if (questions.length > 0) {
            data.appendMessageAnnotation({
              type: "suggested_questions",
              data: questions
            });
          }
          data.close();
          return;
        }
        const text = trimStartOfStream((_a2 = value.delta) != null ? _a2 : "");
        if (text) {
          llmTextResponse += text;
          controller.enqueue(text);
        }
      });
    }
  });
}

// src/controllers/chat.controller.ts
var chat = (req, res) => __async(void 0, null, function* () {
  var _a;
  const vercelStreamData = new StreamData2();
  const streamTimeout = createStreamTimeout(vercelStreamData);
  try {
    const { messages, data } = req.body;
    const userMessage = messages.pop();
    if (!messages || !userMessage || userMessage.role !== "user") {
      return res.status(400).json({
        error: "messages are required in the request body and the last message must be from the user"
      });
    }
    let annotations = userMessage.annotations;
    if (!annotations) {
      annotations = (_a = messages.slice().reverse().find(
        (message) => message.role === "user" && message.annotations
      )) == null ? void 0 : _a.annotations;
    }
    const allAnnotations = [...messages, userMessage].flatMap(
      (message) => {
        var _a2;
        return (_a2 = message.annotations) != null ? _a2 : [];
      }
    );
    const ids = retrieveDocumentIds(allAnnotations);
    const chatEngine = yield createChatEngine(ids, data);
    const userMessageContent = convertMessageContent2(
      userMessage.content,
      annotations
    );
    const callbackManager = createCallbackManager(vercelStreamData);
    const response = yield Settings4.withCallbackManager(callbackManager, () => {
      return chatEngine.chat({
        message: userMessageContent,
        chatHistory: messages,
        stream: true
      });
    });
    const stream = LlamaIndexStream(
      response,
      vercelStreamData,
      messages
    );
    return streamToResponse(stream, res, {}, vercelStreamData);
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return res.status(500).json({
      detail: error.message
    });
  } finally {
    clearTimeout(streamTimeout);
  }
});

// src/controllers/engine/settings.ts
import {
  Anthropic,
  Gemini,
  GeminiEmbedding,
  Groq,
  MistralAI,
  MistralAIEmbedding,
  OpenAI,
  OpenAIEmbedding,
  Settings as Settings5
} from "llamaindex";
import { HuggingFaceEmbedding } from "llamaindex/embeddings/HuggingFaceEmbedding";
import { OllamaEmbedding } from "llamaindex/embeddings/OllamaEmbedding";
import { Ollama } from "llamaindex/llm/ollama";
var CHUNK_SIZE = 512;
var CHUNK_OVERLAP = 20;
var initSettings = () => __async(void 0, null, function* () {
  console.log(`Using '${process.env.MODEL_PROVIDER}' model provider`);
  if (!process.env.MODEL || !process.env.EMBEDDING_MODEL) {
    throw new Error("'MODEL' and 'EMBEDDING_MODEL' env variables must be set.");
  }
  switch (process.env.MODEL_PROVIDER) {
    case "ollama":
      initOllama();
      break;
    case "groq":
      initGroq();
      break;
    case "anthropic":
      initAnthropic();
      break;
    case "gemini":
      initGemini();
      break;
    case "mistral":
      initMistralAI();
      break;
    case "azure-openai":
      initAzureOpenAI();
      break;
    default:
      initOpenAI();
      break;
  }
  Settings5.chunkSize = CHUNK_SIZE;
  Settings5.chunkOverlap = CHUNK_OVERLAP;
});
function initOpenAI() {
  var _a;
  Settings5.llm = new OpenAI({
    model: (_a = process.env.MODEL) != null ? _a : "gpt-4o-mini",
    maxTokens: process.env.LLM_MAX_TOKENS ? Number(process.env.LLM_MAX_TOKENS) : void 0
  });
  Settings5.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM) : void 0
  });
}
function initAzureOpenAI() {
  var _a, _b;
  const AZURE_OPENAI_MODEL_MAP = {
    "gpt-35-turbo": "gpt-3.5-turbo",
    "gpt-35-turbo-16k": "gpt-3.5-turbo-16k",
    "gpt-4o": "gpt-4o",
    "gpt-4": "gpt-4",
    "gpt-4-32k": "gpt-4-32k",
    "gpt-4-turbo": "gpt-4-turbo",
    "gpt-4-turbo-2024-04-09": "gpt-4-turbo",
    "gpt-4-vision-preview": "gpt-4-vision-preview",
    "gpt-4-1106-preview": "gpt-4-1106-preview",
    "gpt-4o-2024-05-13": "gpt-4o-2024-05-13"
  };
  const azureConfig = {
    apiKey: process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.OPENAI_API_VERSION
  };
  Settings5.llm = new OpenAI({
    model: (_b = AZURE_OPENAI_MODEL_MAP[(_a = process.env.MODEL) != null ? _a : "gpt-35-turbo"]) != null ? _b : "gpt-3.5-turbo",
    maxTokens: process.env.LLM_MAX_TOKENS ? Number(process.env.LLM_MAX_TOKENS) : void 0,
    azure: __spreadProps(__spreadValues({}, azureConfig), {
      deployment: process.env.AZURE_OPENAI_LLM_DEPLOYMENT
    })
  });
  Settings5.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM) : void 0,
    azure: __spreadProps(__spreadValues({}, azureConfig), {
      deployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    })
  });
}
function initOllama() {
  var _a, _b, _c;
  const config = {
    host: (_a = process.env.OLLAMA_BASE_URL) != null ? _a : "http://127.0.0.1:11434"
  };
  Settings5.llm = new Ollama({
    model: (_b = process.env.MODEL) != null ? _b : "",
    config
  });
  Settings5.embedModel = new OllamaEmbedding({
    model: (_c = process.env.EMBEDDING_MODEL) != null ? _c : "",
    config
  });
}
function initGroq() {
  const embedModelMap = {
    "all-MiniLM-L6-v2": "Xenova/all-MiniLM-L6-v2",
    "all-mpnet-base-v2": "Xenova/all-mpnet-base-v2"
  };
  const modelMap = {
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192",
    "mixtral-8x7b": "mixtral-8x7b-32768"
  };
  Settings5.llm = new Groq({
    model: modelMap[process.env.MODEL]
  });
  Settings5.embedModel = new HuggingFaceEmbedding({
    modelType: embedModelMap[process.env.EMBEDDING_MODEL]
  });
}
function initAnthropic() {
  const embedModelMap = {
    "all-MiniLM-L6-v2": "Xenova/all-MiniLM-L6-v2",
    "all-mpnet-base-v2": "Xenova/all-mpnet-base-v2"
  };
  Settings5.llm = new Anthropic({
    model: process.env.MODEL
  });
  Settings5.embedModel = new HuggingFaceEmbedding({
    modelType: embedModelMap[process.env.EMBEDDING_MODEL]
  });
}
function initGemini() {
  Settings5.llm = new Gemini({
    model: process.env.MODEL
  });
  Settings5.embedModel = new GeminiEmbedding({
    model: process.env.EMBEDDING_MODEL
  });
}
function initMistralAI() {
  Settings5.llm = new MistralAI({
    model: process.env.MODEL
  });
  Settings5.embedModel = new MistralAIEmbedding({
    model: process.env.EMBEDDING_MODEL
  });
}

// src/routes/chat.route.ts
var llmRouter = express.Router();
initSettings();
llmRouter.route("/").post(chat);
llmRouter.route("/request").post(chatRequest);
llmRouter.route("/config").get(chatConfig);
llmRouter.route("/config/llamacloud").get(chatLlamaCloudConfig);
llmRouter.route("/upload").post(chatUpload);
var chat_route_default = llmRouter;

// index.ts
var app = express2();
var port = parseInt(process.env.PORT || "8000");
var env = process.env["NODE_ENV"];
var isDevelopment = !env || env === "development";
var prodCorsOrigin = process.env["PROD_CORS_ORIGIN"];
initObservability();
app.use(express2.json({ limit: "50mb" }));
if (isDevelopment) {
  console.warn("Running in development mode - allowing CORS for all origins");
  app.use(cors());
} else if (prodCorsOrigin) {
  console.log(
    `Running in production mode - allowing CORS for domain: ${prodCorsOrigin}`
  );
  const corsOptions = {
    origin: prodCorsOrigin
    // Restrict to production domain
  };
  app.use(cors(corsOptions));
} else {
  console.warn("Production CORS origin not set, defaulting to no CORS.");
}
app.use("/api/files/data", express2.static("data"));
app.use("/api/files/output", express2.static("output"));
app.use(express2.text());
app.get("/", (req, res) => {
  res.send("LlamaIndex Express Server");
});
app.use("/api/chat", chat_route_default);
app.listen(port, () => {
  console.log(`\u26A1\uFE0F[server]: Server is running at http://localhost:${port}`);
});
