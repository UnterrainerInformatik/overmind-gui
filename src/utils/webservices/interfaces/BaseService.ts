import { CrudService } from '@/utils/webservices/interfaces/CrudService'
import { GetListConfigObject } from '@/utils/webservices/interfaces/GetListConfigObject'
import { singleton as axiosUtils } from '@/utils/axiosUtils'

export class BaseService implements CrudService {
  protected server: string
  protected endpointPath: string
  protected axiosUtils = axiosUtils

  constructor (server: string, endpointPath: string) {
    this.server = server
    this.endpointPath = endpointPath
  }

  async getById (id: string | number): Promise<any> {
    return this.axiosUtils.getById(this.server, this.endpointPath, id)
  }

  getList (config?: GetListConfigObject): Promise<any> {
    config = Object.assign({}, config)
    return this.axiosUtils.getList(this.server, this.endpointPath, config.size, config.offset, config.additionalQueryParams)
  }

  getFirst (additionalQueryParams: string): Promise<any> {
    return this.getList({ size: 1, additionalQueryParams }).then((response) => {
      return response.entries.length === 0 ? null : response.entries[0]
    })
  }

  del (id: string | number): Promise<any> {
    return this.axiosUtils.del(this.server, this.endpointPath, id)
  }

  put (id: string | number, dataProvider: () => object): Promise<any> {
    return this.axiosUtils.put(this.server, this.endpointPath, id, dataProvider)
  }

  post (dataProvider: () => object): Promise<any> {
    return this.axiosUtils.post(this.server, this.endpointPath, dataProvider)
  }
}
