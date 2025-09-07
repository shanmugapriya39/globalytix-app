const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function getJsonStrict(url: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const text = await response.text();
          errorMessage = text.substring(0, 120) || errorMessage;
        }
      } else {
        const text = await response.text();
        errorMessage = `Non-JSON response: ${text.substring(0, 120)}`;
      }
      
      throw new Error(errorMessage);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response, got: ${text.substring(0, 120)}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    throw error;
  }
}

// Streamlined API functions following the new architecture

// Translate English to many targets in one request
export async function translateMany(text: string, targets: string[]) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLangs: targets })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  
  const data = await response.json();
  return data.translations as { to: string; text: string }[];
}

// Simple concurrency limiter
function createLimiter(limit = 3) {
  let active = 0;
  const queue: (() => void)[] = [];
  
  const run = <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    const exec = async () => {
      active++;
      try { 
        resolve(await fn()); 
      } catch (e) { 
        reject(e); 
      } finally { 
        active--; 
        if (queue.length) queue.shift()!(); 
      }
    };
    
    active < limit ? exec() : queue.push(exec);
  });
  
  return run;
}

const runLimited = createLimiter(3);

// TTS with caching and concurrency limiting
const audioCache = new Map<string, Blob>();

export async function tts(text: string, voice: string, locale: string): Promise<Blob> {
  const key = `${locale}:${voice}:${text}`;
  
  if (audioCache.has(key)) {
    return audioCache.get(key)!;
  }
  
  const response = await runLimited(() => fetch('/api/tts-single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, locale })
  }));
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  
  const blob = await response.blob();
  audioCache.set(key, blob);
  return blob;
}

export async function postJsonStrict(url: string, body: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, fall back to text
          const text = await response.text();
          errorMessage = text.substring(0, 120) || errorMessage;
        }
      } else {
        const text = await response.text();
        errorMessage = `Non-JSON response: ${text.substring(0, 120)}`;
      }
      
      throw new Error(errorMessage);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response, got: ${text.substring(0, 120)}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    throw error;
  }
}
