import axios from 'axios'

export interface DoubleTakePerson {
  name: string;
  imageCount: number;
}

export interface DoubleTakeReferenceImage {
  id: number;
  name: string;
  filename: string;
  key: string;
  url: string;
}

/**
 * Talks directly to a home Double Take instance (not java-overmind-server), so this is kept
 * outside BaseService/rest.ts, following frigateService.ts's convention. Double Take has no
 * "person" entity of its own - a person is just the distinct `name` used on training images,
 * so every method here takes that name as identifier rather than a numeric id (see design.md -
 * Decisions).
 */
export class DoubleTakeService {
  private static instanceField: DoubleTakeService
  private baseUrl = 'https://doubletake.unterrainer.info'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new DoubleTakeService())
    }
    return this.instanceField
  }

  public async getPeople (): Promise<DoubleTakePerson[]> {
    const response = await this.getWithRetry(`${this.baseUrl}/api/train/status`)
    const rows: any[] = response.data || []
    return rows.map(row => ({ name: row.name, imageCount: row.total }))
  }

  /**
   * Double Take has no endpoint to create an empty person: a name only starts existing once it
   * has a trained image, so this requires at least one file (see design.md - Decisions).
   */
  public async createPerson (name: string, files: File[]): Promise<void> {
    await this.addTrainingImages(name, files)
  }

  public async uploadReferenceImages (name: string, files: File[]): Promise<void> {
    await this.addTrainingImages(name, files)
  }

  public async getReferenceImages (name: string): Promise<DoubleTakeReferenceImage[]> {
    const images: DoubleTakeReferenceImage[] = []
    let page = 1
    let total = Infinity
    while (images.length < total) {
      const response = await this.getWithRetry(`${this.baseUrl}/api/train`, { params: { name, page } })
      const data = response.data || {}
      total = typeof data.total === 'number' ? data.total : images.length
      const files: any[] = data.files || []
      if (!files.length) {
        break
      }
      images.push(...files.map((file: any) => this.toReferenceImage(name, file)))
      page += 1
    }
    return images
  }

  /**
   * `DELETE /api/train/remove/:name` only unregisters the image from the face-recognition
   * detector (e.g. CompreFace); the file and its `file` table row survive and it would still be
   * listed by getReferenceImages. `DELETE /api/storage/train` is the call that actually deletes
   * it (see design.md - Decisions).
   */
  public async deleteReferenceImage (name: string, image: DoubleTakeReferenceImage): Promise<void> {
    await axios.delete(`${this.baseUrl}/api/train/remove/${encodeURIComponent(name)}`, { data: [image.id] })
    await axios.delete(`${this.baseUrl}/api/storage/train`, {
      data: { files: [{ id: image.id, key: image.key }] }
    })
  }

  /**
   * `DELETE /api/train/remove/:name` (no ids) unregisters the whole person from the detector
   * (e.g. CompreFace); `DELETE /api/filesystem/folders/:name` then removes the training folder,
   * its files and the matching `file`/`train` rows in one call (see design.md - Decisions).
   */
  public async deletePerson (name: string): Promise<void> {
    const normalized = this.normalizeName(name)
    await axios.delete(`${this.baseUrl}/api/train/remove/${encodeURIComponent(normalized)}`)
    await axios.delete(`${this.baseUrl}/api/filesystem/folders/${encodeURIComponent(normalized)}`)
  }

  /**
   * `POST /api/train/add/:name` writes an uploaded file straight into `train/<name>/` without
   * creating that directory first; for a name that has never been trained before, that directory
   * does not exist yet and the write crashes the whole Double Take process (confirmed against the
   * running instance - see design.md - Decisions). `POST /api/filesystem/folders/:name` is the
   * call the real Double Take UI uses to create that directory up front (guarded with
   * `fs.existsSync`, safe to call even when the folder already exists), so every upload goes
   * through it first.
   */
  private async addTrainingImages (name: string, files: File[]): Promise<void> {
    const normalized = this.normalizeName(name)
    await axios.post(`${this.baseUrl}/api/filesystem/folders/${encodeURIComponent(normalized)}`)
    const formData = new FormData()
    files.forEach(file => formData.append('files[]', file, file.name))
    await axios.post(`${this.baseUrl}/api/train/add/${encodeURIComponent(normalized)}`, formData)
  }

  // Double Take's own UI lowercases a newly typed folder name before creating it; every existing
  // name in this instance is lowercase, so new ones follow the same convention.
  private normalizeName (name: string): string {
    return name.trim().toLowerCase()
  }

  /**
   * `train.add()` runs as a fire-and-forget background job after an upload responds (confirmed
   * against the running instance): a GET fired right after that upload can race that job's SQLite
   * writes and fail with a transient 5xx even though the upload itself succeeded. Retrying a
   * couple of times with a short delay clears it without the caller having to know why.
   */
  private async getWithRetry (url: string, config: any = {}, attempt = 1): Promise<any> {
    try {
      return await axios.get(url, config)
    } catch (err) {
      const status = err && err.response && err.response.status
      if (attempt >= 3 || !status || status < 500) {
        throw err
      }
      await new Promise(resolve => setTimeout(resolve, 400 * attempt))
      return this.getWithRetry(url, config, attempt + 1)
    }
  }

  private toReferenceImage (name: string, file: any): DoubleTakeReferenceImage {
    const filename = file.file.filename
    const key = file.file.key
    return {
      id: file.id,
      name,
      filename,
      key,
      url: `${this.baseUrl}/api/storage/train/${encodeURIComponent(name)}/${encodeURIComponent(filename)}?thumb`
    }
  }
}

export const singleton = DoubleTakeService.getInstance()
