declare module '@vercel/blob' {
  export interface PutOptions {
    access?: 'public' | 'private';
    addRandomSuffix?: boolean;
    cacheControlMaxAge?: number;
    contentType?: string;
    multipart?: boolean;
    token?: string;
  }

  export interface PutResponse {
    url: string;
    pathname: string;
    contentType: string | null;
    contentDisposition: string | null;
    size: number;
  }

  export interface ListResponse {
    blobs: {
      pathname: string;
      contentType: string | null;
      contentDisposition: string | null;
      size: number;
      uploadedAt: string;
    }[];
    cursor?: string;
  }

  export function put(
    pathname: string,
    body: string | Buffer | ArrayBuffer | Blob | File | ReadableStream,
    options?: PutOptions
  ): Promise<PutResponse>;

  export function del(urlOrPathname: string, token?: string): Promise<void>;

  export function list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
    token?: string;
  }): Promise<ListResponse>;
} 