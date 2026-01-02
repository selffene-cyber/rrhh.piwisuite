# Referencia de Gemini API - Múltiples Lenguajes

Este documento proporciona ejemplos de cómo usar la API de Gemini desde diferentes lenguajes y frameworks.

## Tabla de Contenidos

1. [REST API (Base Universal)](#rest-api-base-universal)
2. [JavaScript/TypeScript](#javascripttypescript)
3. [Python](#python)
4. [Go](#go)
5. [Java](#java)

---

## REST API (Base Universal)

La API REST es la base que usan todos los SDKs. Es útil para cualquier lenguaje que pueda hacer peticiones HTTP.

### Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}
```

### Modelos Disponibles

- `gemini-1.5-flash` - Rápido y económico (recomendado para la mayoría de casos)
- `gemini-1.5-pro` - Más potente, mejor para tareas complejas
- `gemini-2.0-flash-exp` - Experimental (puede tener límites más estrictos)

### Ejemplo con cURL

```bash
curl -X POST \
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=TU_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Responde solo con OK"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1024,
      "topP": 0.95,
      "topK": 40
    }
  }'
```

### Ejemplo con fetch (JavaScript)

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'Responde solo con OK'
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
        topK: 40
      }
    })
  }
);

const data = await response.json();
const answer = data.candidates[0].content.parts[0].text;
console.log(answer);
```

### Respuesta de Ejemplo

```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "OK"
      }]
    }
  }],
  "usageMetadata": {
    "promptTokenCount": 5,
    "candidatesTokenCount": 1,
    "totalTokenCount": 6
  }
}
```

---

## JavaScript/TypeScript

### Instalación

```bash
npm install @google/generative-ai
```

### Uso Básico

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function askGemini(prompt: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
      topK: 40,
    },
  });

  const response = await result.response;
  return {
    text: response.text(),
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount,
      candidatesTokens: response.usageMetadata?.candidatesTokenCount,
      totalTokens: response.usageMetadata?.totalTokenCount,
    }
  };
}

// Uso
const result = await askGemini('¿Qué es una liquidación de sueldo?');
console.log(result.text);
```

### Cliente Completo (Server-Side)

```typescript
// lib/services/geminiClient.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeminiRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface GeminiResponse {
  answer: string;
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

export async function askGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const { prompt, temperature = 0.7, maxTokens = 1024, model = 'gemini-1.5-flash' } = request;
  
  const geminiModel = genAI.getGenerativeModel({ model });
  
  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
    });

    const response = await result.response;
    
    return {
      answer: response.text(),
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount,
        candidatesTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
      }
    };
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new Error('Límite de solicitudes excedido. Por favor, espera unos minutos.');
    }
    throw error;
  }
}
```

---

## Python

### Instalación

```bash
pip install google-generativeai
```

### Uso Básico

```python
import google.generativeai as genai
import os

# Configurar API key
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def ask_gemini(prompt: str, temperature: float = 0.7, max_tokens: int = 1024):
    """Realiza una pregunta a Gemini API"""
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    response = model.generate_content(
        prompt,
        generation_config={
            'temperature': temperature,
            'max_output_tokens': max_tokens,
            'top_p': 0.95,
            'top_k': 40,
        }
    )
    
    return {
        'answer': response.text,
        'usage': {
            'prompt_tokens': response.usage_metadata.prompt_token_count,
            'candidates_tokens': response.usage_metadata.candidates_token_count,
            'total_tokens': response.usage_metadata.total_token_count,
        }
    }

# Uso
result = ask_gemini('¿Qué es una liquidación de sueldo?')
print(result['answer'])
```

### Cliente Completo con Manejo de Errores

```python
import google.generativeai as genai
import os
from typing import Dict, Optional

class GeminiClient:
    def __init__(self, api_key: Optional[str] = None, model: str = 'gemini-1.5-flash'):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError('GEMINI_API_KEY no está configurada')
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
    
    def ask(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Dict:
        """Realiza una pregunta a Gemini API"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': temperature,
                    'max_output_tokens': max_tokens,
                    'top_p': 0.95,
                    'top_k': 40,
                }
            )
            
            return {
                'success': True,
                'answer': response.text,
                'usage': {
                    'prompt_tokens': response.usage_metadata.prompt_token_count,
                    'candidates_tokens': response.usage_metadata.candidates_token_count,
                    'total_tokens': response.usage_metadata.total_token_count,
                }
            }
        except Exception as e:
            error_msg = str(e)
            if '429' in error_msg or 'rate limit' in error_msg.lower():
                raise Exception('Límite de solicitudes excedido. Por favor, espera unos minutos.')
            raise Exception(f'Error al comunicarse con Gemini: {error_msg}')

# Uso
client = GeminiClient()
result = client.ask('¿Qué es una liquidación de sueldo?')
print(result['answer'])
```

### Ejemplo con FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from gemini_client import GeminiClient

app = FastAPI()
gemini = GeminiClient()

class QuestionRequest(BaseModel):
    question: str
    temperature: float = 0.7
    max_tokens: int = 1024

@app.post("/api/ai/ask")
async def ask_ai(request: QuestionRequest):
    try:
        result = gemini.ask(
            request.question,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Go

### Instalación

```bash
go get github.com/google/generative-ai-go
```

### Uso Básico

```go
package main

import (
    "context"
    "fmt"
    "os"
    
    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

func askGemini(ctx context.Context, prompt string) (string, error) {
    client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
    if err != nil {
        return "", err
    }
    defer client.Close()

    model := client.GenerativeModel("gemini-1.5-flash")
    
    resp, err := model.GenerateContent(ctx, genai.Text(prompt))
    if err != nil {
        return "", err
    }

    return fmt.Sprint(resp.Candidates[0].Content.Parts[0]), nil
}

func main() {
    ctx := context.Background()
    answer, err := askGemini(ctx, "Responde solo con OK")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Println(answer)
}
```

### Cliente Completo

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    
    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

type GeminiClient struct {
    client *genai.Client
    model  *genai.GenerativeModel
}

type GeminiResponse struct {
    Answer string
    Usage  struct {
        PromptTokens     int
        CandidatesTokens int
        TotalTokens      int
    }
}

func NewGeminiClient(apiKey string, modelName string) (*GeminiClient, error) {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        return nil, err
    }

    return &GeminiClient{
        client: client,
        model:  client.GenerativeModel(modelName),
    }, nil
}

func (gc *GeminiClient) Ask(ctx context.Context, prompt string, temperature float32, maxTokens int32) (*GeminiResponse, error) {
    resp, err := gc.model.GenerateContent(ctx, genai.Text(prompt))
    if err != nil {
        return nil, fmt.Errorf("error al generar contenido: %w", err)
    }

    if len(resp.Candidates) == 0 {
        return nil, fmt.Errorf("no se recibió respuesta de Gemini")
    }

    answer := fmt.Sprint(resp.Candidates[0].Content.Parts[0])
    
    response := &GeminiResponse{
        Answer: answer,
    }
    
    if resp.UsageMetadata != nil {
        response.Usage.PromptTokens = int(resp.UsageMetadata.PromptTokenCount)
        response.Usage.CandidatesTokens = int(resp.UsageMetadata.CandidatesTokenCount)
        response.Usage.TotalTokens = int(resp.UsageMetadata.TotalTokenCount)
    }

    return response, nil
}

func (gc *GeminiClient) Close() {
    gc.client.Close()
}

// Uso
func main() {
    client, err := NewGeminiClient(os.Getenv("GEMINI_API_KEY"), "gemini-1.5-flash")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    defer client.Close()

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    resp, err := client.Ask(ctx, "¿Qué es una liquidación de sueldo?", 0.7, 1024)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Respuesta: %s\n", resp.Answer)
    fmt.Printf("Tokens usados: %d\n", resp.Usage.TotalTokens)
}
```

---

## Java

### Dependencia Maven

```xml
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-aiplatform</artifactId>
    <version>3.0.0</version>
</dependency>
```

### Uso Básico

```java
import com.google.cloud.aiplatform.v1beta1.*;
import com.google.protobuf.Value;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class GeminiClient {
    private static final String PROJECT_ID = "tu-project-id";
    private static final String LOCATION = "us-central1";
    private static final String MODEL = "gemini-1.5-flash";
    
    public String askGemini(String prompt) throws IOException {
        try (PredictionServiceClient client = PredictionServiceClient.create()) {
            String endpoint = String.format(
                "projects/%s/locations/%s/publishers/google/models/%s",
                PROJECT_ID, LOCATION, MODEL
            );
            
            // Construir la solicitud
            List<Value> contents = new ArrayList<>();
            Value content = Value.newBuilder()
                .setStructValue(com.google.protobuf.Struct.newBuilder()
                    .putFields("parts", Value.newBuilder()
                        .setListValue(com.google.protobuf.ListValue.newBuilder()
                            .addValues(Value.newBuilder()
                                .setStructValue(com.google.protobuf.Struct.newBuilder()
                                    .putFields("text", Value.newBuilder()
                                        .setStringValue(prompt)
                                        .build())
                                    .build())
                                .build())
                            .build())
                        .build())
                    .build())
                .build();
            contents.add(content);
            
            // Realizar la solicitud
            PredictRequest request = PredictRequest.newBuilder()
                .setEndpoint(endpoint)
                .setInstances(0, Value.newBuilder()
                    .setListValue(com.google.protobuf.ListValue.newBuilder()
                        .addAllValues(contents)
                        .build())
                    .build())
                .build();
            
            PredictResponse response = client.predict(request);
            
            // Extraer la respuesta
            if (response.getPredictionsCount() > 0) {
                Value prediction = response.getPredictions(0);
                return prediction.getStructValue()
                    .getFieldsMap()
                    .get("content")
                    .getStringValue();
            }
            
            return "No se recibió respuesta";
        }
    }
}
```

### Alternativa con REST API (Más Simple)

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;

public class GeminiRESTClient {
    private static final String API_KEY = System.getenv("GEMINI_API_KEY");
    private static final String API_URL = 
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    private final HttpClient client;
    private final Gson gson;
    
    public GeminiRESTClient() {
        this.client = HttpClient.newHttpClient();
        this.gson = new Gson();
    }
    
    public String askGemini(String prompt) throws IOException, InterruptedException {
        JsonObject requestBody = new JsonObject();
        JsonArray contents = new JsonArray();
        JsonObject content = new JsonObject();
        JsonArray parts = new JsonArray();
        JsonObject part = new JsonObject();
        part.addProperty("text", prompt);
        parts.add(part);
        content.add("parts", parts);
        contents.add(content);
        requestBody.add("contents", contents);
        
        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("temperature", 0.7);
        generationConfig.addProperty("maxOutputTokens", 1024);
        requestBody.add("generationConfig", generationConfig);
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(API_URL + "?key=" + API_KEY))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(requestBody)))
            .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new IOException("Error HTTP: " + response.statusCode());
        }
        
        JsonObject jsonResponse = gson.fromJson(response.body(), JsonObject.class);
        JsonArray candidates = jsonResponse.getAsJsonArray("candidates");
        JsonObject candidate = candidates.get(0).getAsJsonObject();
        JsonObject contentObj = candidate.getAsJsonObject("content");
        JsonArray partsArray = contentObj.getAsJsonArray("parts");
        JsonObject textPart = partsArray.get(0).getAsJsonObject();
        
        return textPart.get("text").getAsString();
    }
}
```

---

## Comparación de Lenguajes

| Lenguaje | SDK Oficial | Complejidad | Mejor Para |
|----------|-------------|-------------|------------|
| **REST** | ✅ Universal | ⭐ Baja | Cualquier lenguaje |
| **JavaScript/TypeScript** | ✅ `@google/generative-ai` | ⭐⭐ Media | Next.js, Node.js, React |
| **Python** | ✅ `google-generativeai` | ⭐⭐ Media | Backend, ML, Scripts |
| **Go** | ✅ `generative-ai-go` | ⭐⭐⭐ Media-Alta | Microservicios, APIs |
| **Java** | ⚠️ Complejo | ⭐⭐⭐⭐ Alta | Enterprise, Android |

## Recomendaciones

1. **Para Next.js/React**: Usa JavaScript/TypeScript con `@google/generative-ai`
2. **Para Backend Python**: Usa `google-generativeai` (más simple)
3. **Para Microservicios Go**: Usa `generative-ai-go`
4. **Para cualquier otro caso**: Usa REST API directamente

## Notas Importantes

- **Rate Limits**: Todos los modelos tienen límites. `gemini-1.5-flash` tiene mejores límites que `gemini-2.0-flash-exp`
- **API Key**: Siempre almacena la API key en variables de entorno, nunca en el código
- **Errores**: Maneja siempre los errores 429 (rate limit) y 401/403 (autenticación)
- **Tokens**: Monitorea el uso de tokens para controlar costos

## Recursos Adicionales

- [Documentación Oficial de Gemini](https://ai.google.dev/docs)
- [Límites y Cuotas](https://ai.google.dev/pricing)
- [Modelos Disponibles](https://ai.google.dev/models/gemini)

