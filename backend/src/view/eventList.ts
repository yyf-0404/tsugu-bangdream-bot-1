import { Card } from "@/types/Card";
import mainAPI from "@/types/_Main"
import { match, checkRelationList, FuzzySearchResult } from "@/fuzzySearch"
import { Canvas } from 'skia-canvas'
import { drawDatablock, drawDatablockHorizontal } from '@/components/dataBlock';
import { line } from '@/components/list';
import { stackImage, stackImageHorizontal, resizeImage } from '@/components/utils'
import { drawTitle } from '@/components/title';
import { outputFinalBuffer } from '@/image/output'
import { Server, getIcon, getServerByName } from '@/types/Server'
import { Event, getPresentEvent, sortEventList } from '@/types/Event';
import { drawCardListInList } from '@/components/list/cardIconList';
import { GetProbablyTimeDifference, changeTimefomant } from '@/components/list/time';
import { drawTextWithImages } from '@/image/text';
import { getEventGachaAndCardList } from './eventDetail'
import { drawDottedLine } from '@/image/dottedLine'
import { statConfig } from '@/components/list/stat'
import { globalDefaultServer } from '@/config';


const maxHeight = 7000
const maxColumns = 7

//表格用默认虚线
export const line2: Canvas = drawDottedLine({
    width: 30,
    height: 7000,
    startX: 5,
    startY: 0,
    endX: 15,
    endY: 6995,
    radius: 2,
    gap: 10,
    color: "#a8a8a8"
})

export async function drawEventList(matches: FuzzySearchResult, displayedServerList: Server[] = globalDefaultServer, compress: boolean): Promise<Array<Buffer | string>> {
    //计算模糊搜索结果
    var tempEventList: Array<Event> = [];//最终输出的活动列表
    var eventIdList: Array<number> = Object.keys(mainAPI['events']).map(Number);//所有活动ID列表
    for (let i = 0; i < eventIdList.length; i++) {
        const tempEvent = new Event(eventIdList[i]);
        var isMatch = match(matches, tempEvent, []);
        // 如果在所有所选服务器列表中都不存在，则不输出
        var numberOfNotReleasedServer = 0;
        for (var j = 0; j < displayedServerList.length; j++) {
            var server = displayedServerList[j];
            if (tempEvent.startAt[server] == null) {
                numberOfNotReleasedServer++;
            }
        }
        if (numberOfNotReleasedServer == displayedServerList.length) {
            isMatch = false;
        }

        
        if (matches._number != undefined) {
            if (isMatch || Object.keys(matches).length == 1) {
                isMatch = matches._number.includes(tempEvent.eventId)
            }
        }
        //如果有数字关系词，则判断关系词
        if (matches._relationStr != undefined) {
            //如果之后范围的话则直接判断
            if (isMatch || Object.keys(matches).length == 1) {
                isMatch = checkRelationList(tempEvent.eventId, matches._relationStr as string[])
            }
        }

        if (isMatch) {
            tempEventList.push(tempEvent);
        }
    }
    if (tempEventList.length == 0) {
        return ['没有搜索到符合条件的活动']
    }

    // 按照开始时间排序
    sortEventList(tempEventList)

    var eventPromises: Promise<{ index: number, image: Canvas }>[] = [];
    var tempH = 0;

    for (var i = 0; i < tempEventList.length; i++) {
        eventPromises.push(drawEventInList(tempEventList[i], displayedServerList).then(image => ({ index: i, image: image })));
    }

    var eventResults = await Promise.all(eventPromises);

    eventResults.sort((a, b) => a.index - b.index);

    var tempEventImageList: Canvas[] = [];
    var eventImageListHorizontal: Canvas[] = [];

    for (var i = 0; i < eventResults.length; i++) {
        var tempImage = eventResults[i].image;
        tempH += tempImage.height;
        if (tempH > maxHeight) {
            if (tempEventImageList.length > 0) {
                eventImageListHorizontal.push(stackImage(tempEventImageList));
                eventImageListHorizontal.push(line2);
            }
            tempEventImageList = [];
            tempH = tempImage.height;
        }
        tempEventImageList.push(tempImage);
        tempEventImageList.push(line);
        //最后一张图
        if (i == eventResults.length - 1) {
            eventImageListHorizontal.push(stackImage(tempEventImageList));
            eventImageListHorizontal.push(line2);
        }
    }

    eventImageListHorizontal.pop();

    if (eventImageListHorizontal.length > maxColumns) {
        let times = 0
        let tempImageList: Array<string | Buffer> = []
        tempImageList.push('活动列表过长，已经拆分输出')
        for (let i = 0; i < eventImageListHorizontal.length; i++) {
            const tempCanv = eventImageListHorizontal[i];
            if (tempCanv == line2) {
                continue
            }
            const all = []
            if (times = 0) {
                all.push(drawTitle('查询', '活动列表'))
            }
            all.push(drawDatablock({ list: [tempCanv] }))
            const buffer = await outputFinalBuffer({
                imageList: all,
                useEasyBG: true
            })
            tempImageList.push(buffer)
            times += 1
        }
        return tempImageList
    } else {
        const all = []
        const eventListImage = drawDatablockHorizontal({
            list: eventImageListHorizontal
        })
        all.push(drawTitle('查询', '活动列表'))
        all.push(eventListImage)
        const buffer = await outputFinalBuffer({
            imageList: all,
            useEasyBG: true,
            compress: compress,
        })
        return [buffer]
    }

}

async function drawEventInList(event: Event, displayedServerList: Server[] = globalDefaultServer): Promise<Canvas> {
    await event.initFull(false)
    var textSize = 25 * 3 / 4;
    var content = []
    //活动类型
    content.push(`ID: ${event.eventId.toString()}  ${await event.getTypeName()}\n`)
    //活动时间
    var numberOfServer = Math.min(displayedServerList.length, 2)
    const currentEvent = getPresentEvent(getServerByName("cn"));
    for (var i = 0; i < numberOfServer; i++) {
        let server = displayedServerList[i]
        if (server == getServerByName('cn') && event.startAt[server] == null && event.eventId > currentEvent.eventId) {
            content.push(await getIcon(server), `${changeTimefomant(GetProbablyTimeDifference(event.eventId, currentEvent))} (预计开放时间)\n`)
        }
        else {
            content.push(await getIcon(server), `${changeTimefomant(event.startAt[server])} - ${changeTimefomant(event.endAt[server])}\n`)
        }
    }
    //活动加成
    //属性
    var attributeList = event.getAttributeList()
    for (var precent in attributeList) {
        for (var i = 0; i < attributeList[precent].length; i++) {
            content.push(await attributeList[precent][i].getIcon())
        }
        content.push(`+${precent}% `)
    }

    //角色
    var characterList = event.getCharacterList()
    for (var precent in characterList) {
        for (var i = 0; i < characterList[precent].length; i++) {
            content.push(await characterList[precent][i].getIcon())
        }
        content.push(`+${precent}% `)
    }

    //偏科，如果有的话
    if (Object.keys(event.eventCharacterParameterBonus).length != 0) {
        var statText = ''
        for (const i in event.eventCharacterParameterBonus) {
            if (i == 'eventId') {
                continue
            }
            if (Object.prototype.hasOwnProperty.call(event.eventCharacterParameterBonus, i)) {
                const element = event.eventCharacterParameterBonus[i];
                if (element == 0) {
                    continue
                }
                statText += ` ${statConfig[i].name} +${element}%`
            }
        }
        content.push(statText)
    }

    var textImage = drawTextWithImages({
        content: content,
        textSize,
        maxWidth: 500
    })
    const eventBannerImage = resizeImage({
        image: await event.getBannerImage(),
        heightMax: 100
    })
    var imageUp = stackImageHorizontal([eventBannerImage, new Canvas(20, 1), textImage])

    //活动期间卡池卡牌
    var cardList: Card[] = []
    var cardIdList: number[] = []//用于去重
    for (var i = 0; i < displayedServerList.length; i++) {
        var server = displayedServerList[i]
        var EventGachaAndCardList = await getEventGachaAndCardList(event, server, true)
        var tempGachaCardList = EventGachaAndCardList.gachaCardList
        for (let i = 0; i < tempGachaCardList.length; i++) {
            const tempCard = tempGachaCardList[i];
            if (cardIdList.indexOf(tempCard.cardId) != -1) {
                continue
            }
            cardIdList.push(tempCard.cardId)
            cardList.push(tempCard)
        }
    }
    var rewardCards = event.rewardCards
    for (var i = 0; i < rewardCards.length; i++) {
        cardList.push(new Card(rewardCards[i]))
    }
    var imageDown = await drawCardListInList({
        cardList: cardList,
        lineHeight: 120,
        trainingStatus: false,
        cardIdVisible: true,
    })
    return stackImage([imageUp, imageDown])
}