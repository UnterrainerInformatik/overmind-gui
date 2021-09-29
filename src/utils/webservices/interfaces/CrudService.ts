import { GetListConfigObject } from './GetListConfigObject'

export interface CrudService {

    getById (fileId: number | string): Promise<any>;

    getList (config?: GetListConfigObject): Promise<any>;

    getFirst (additionalQueryParams: string): Promise<any>;

    del (id: string | number): Promise<any>;

    put (id: string | number, dataProvider: () => object): Promise<any>;

    post (dataProvider: () => object): Promise<any>;
}
