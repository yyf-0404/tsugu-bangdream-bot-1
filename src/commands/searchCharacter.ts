import { drawCharacterList } from '../view/characterList'
import { drawCharacterDetail } from '../view/characterDetail'
import { isInteger } from './utils'
import { fuzzySearch } from './fuzzySearch'
import { Server } from '../types/Server'

export async function commandCharacter(default_servers: Server[], text: string): Promise<Array<Buffer | string>> {
    if (!text) {
        return ['错误: 请输入关键词或角色ID']
    }
    if (isInteger(text)) {
        return await drawCharacterDetail(parseInt(text), default_servers)
    }
    var fuzzySearchResult = fuzzySearch(text.split(' '))
    console.log(fuzzySearchResult)
    if (Object.keys(fuzzySearchResult).length == 0) {
        return ['错误: 没有有效的关键词']
    }
    return await drawCharacterList(fuzzySearchResult, default_servers)

}