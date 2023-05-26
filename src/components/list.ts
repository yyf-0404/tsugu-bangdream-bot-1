import { Canvas, Image, createCanvas } from 'canvas';
import { drawRoundedRectWithText } from '../image/drawRect';
import { drawText, drawTextWithImages } from './text';
import { drawDottedLine } from '../image/dottedLine'
import { Server, getServerByPriority, defaultserverList } from '../types/Server'

//表格用默认虚线
export const line: Canvas = drawDottedLine({
    width: 800,
    height: 30,
    startX: 5,
    startY: 15,
    endX: 795,
    endY: 15,
    radius: 2,
    gap: 10,
    color: "#a8a8a8"
})

interface ListOptions {
    key?: string;
    text?: string;
    content?: Array<string | Canvas | Image>
    textSize?: number;
    lineHeight?: number;
    spacing?: number;
    color?: string;
}

//画表格中的一行
export function drawList({
    key,
    text,
    content,
    textSize = 40,
    lineHeight = textSize * 1.5,
    spacing = textSize / 3,
    color = '#505050'

}: ListOptions): Canvas {
    const xmax = 760
    const keyImage = drawRoundedRectWithText({
        text: key,
        textSize: 30,
    });

    var textImage: Canvas
    if (typeof text == "string") {
        textImage = drawText({ text, maxWidth: xmax, lineHeight });
    }
    else if (content != undefined) {
        textImage = drawTextWithImages({
            content,
            maxWidth: xmax,
            lineHeight,
            textSize,
            spacing,
            color
        });
    }
    else {
        textImage = createCanvas(1, 1)
    }
    if (key == undefined) {
        return textImage
    }
    var ymax = textImage.height + keyImage.height + 10;
    const canvas = createCanvas(800, ymax);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(keyImage, 0, 0);
    ctx.drawImage(textImage, 20, keyImage.height + 10);
    return canvas;
}

interface tipsOptions {
    text?: string;
    content?: Array<string | Canvas | Image>
    textSize?: number;
    lineHeight?: number;
    spacing?: number;
}
export function drawTips({
    text,
    content,
    textSize = 30,
    lineHeight = textSize * 1.5,
    spacing = textSize / 3
}: tipsOptions) {
    const xmax = 760
    var textImage: Canvas
    if (typeof text == "string") {
        textImage = drawText({ text, textSize, maxWidth: xmax, lineHeight });
    }
    else if (content != undefined) {
        textImage = drawTextWithImages({
            textSize,
            content,
            maxWidth: xmax,
            lineHeight,
            spacing
        });
    }
    else {
        textImage = createCanvas(1, 1)
    }
    const canvas = createCanvas(800, textImage.height + 10);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f1f1f1'
    ctx.fillRect(0, 10, 800, textImage.height);
    ctx.drawImage(textImage, 20, 10);
    return canvas;
}


interface ListByServerListOptions {
    key?: string;
    content: Array<string | null>
    serverList?: Array<Server>
}

//通过服务器列表获得内容，服务器icon开头，每一行为服务器对应内容，默认仅日服与简中服
export async function drawListByServerList({
    key,
    content,
    serverList = defaultserverList
}: ListByServerListOptions) {
    var tempcontent: Array<string | Image | Canvas> = []
    //如果只有2个服务器，且内容相同
    if (serverList.length == 2) {
        if (serverList[0].getContentByServer(content) == serverList[1].getContentByServer(content)) {
            var canvas = drawList({
                key: key,
                text: serverList[0].getContentByServer(content)
            })
            return canvas
        }
    }

    function removeElement<T>(arr: T[], n: number): T | undefined {
        if (n >= 0 && n < arr.length) {
            return arr.splice(n, 1)[0];
        }
        return undefined;
    }

    // 移除是content内容是null的服务器
    for (let i = serverList.length - 1; i >= 0; i--) {
        const tempServer = serverList[i];
        if (tempServer.getContentByServer(content) === null) {
            // 移除
            removeElement(serverList, i);
        }
    }

    // 如果没有服务器了，就用其中一个可以的服务器
    if (serverList.length == 0) {
        serverList.push(getServerByPriority(content))
    }

    for (let i = 0; i < serverList.length; i++) {
        const tempServer = serverList[i];
        tempcontent.push(await tempServer.getIcon())
        if (i == serverList.length - 1) {
            tempcontent.push(tempServer.getContentByServer(content))
        }
        else {
            tempcontent.push(tempServer.getContentByServer(content) + '\n')
        }
    }
    var canvas = drawList({
        key: key,
        content: tempcontent
    })
    return canvas
}

//横向组合较短list，高度为最高的list，宽度平分
export function drawListMerge(imageList: Array<Canvas | Image>): Canvas {
    var maxHeight = 0
    for (let i = 0; i < imageList.length; i++) {
        const element = imageList[i];
        if (element.height > maxHeight) {
            maxHeight = element.height
        }
    }
    var canvas = createCanvas(800, maxHeight)
    var ctx = canvas.getContext('2d')
    var x = 0
    for (let i = 0; i < imageList.length; i++) {
        const element = imageList[i];
        ctx.drawImage(element, x, 0)
        x += 800 / imageList.length
    }
    return canvas
}

//画左侧有竖线的排版，用于画block时展示数据
export function drawListWithLine(textImageList: Array<Canvas | Image>): Canvas {
    var x = 30
    var y = 10
    var height = 0
    for (let i = 0; i < textImageList.length; i++) {
        const element = textImageList[i];
        height += element.height
    }
    var canvas = createCanvas(800, height + 10)
    var ctx = canvas.getContext('2d')
    ctx.fillStyle = '#a8a8a8'
    ctx.fillRect(10, 10, 5, height + 20)
    for (let i = 0; i < textImageList.length; i++) {
        const element = textImageList[i];
        ctx.drawImage(element, x, y)
        y += element.height
    }
    return canvas
}

