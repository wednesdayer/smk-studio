export interface OpenedFile {
  readonly path: string
  readonly content: string
}

export interface DesktopApi {
  saveProject(suggestedName: string, content: string): Promise<string | null>
  openProject(): Promise<OpenedFile | null>
  saveWav(suggestedName: string, data: ArrayBuffer): Promise<string | null>
}

declare global {
  interface Window {
    api: DesktopApi
  }
}
