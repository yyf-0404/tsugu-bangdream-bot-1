import { Database } from "koishi"
import { Server } from "../types/Server"

export interface PlayerBinding {
    qq: number,
    server_mode: Server,
    car: boolean,
    server_list: ServerBindingInfo[]
}
export class ServerBindingInfo {
    status: BindingStatus
    tempID: number
    account: string
}
export enum BindingStatus {
    None, Waiting, Success
}

const tsugu_table_name = 'tsugu_player_data'

export async function getPlayerBinding(db: Database, qqId: number): Promise<Partial<PlayerBinding>> {
    const [result] = await db.get(tsugu_table_name, qqId)
    // 如果未能找到对应的结果将返回undefined
    return result
}
export async function upsertPlayerBinding(db: Database, binding: Partial<PlayerBinding>, key: string = 'qq'): Promise<void> {
    await db.upsert(tsugu_table_name, [binding], key)
}