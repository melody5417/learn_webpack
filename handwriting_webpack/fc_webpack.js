const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')
const path = require('path')

const entry = './src/index.js'
let ID = 0

async function createAsset(filename) {
    // 拿入口文件 entry 的内容
    const sourceCode = fs.readFileSync(filename, 'utf-8')
    
    // es6 -> ast
    const ast = parser.parse(sourceCode, {
        sourceType: 'module'
    })
    
    // 获取dependencies
    const dependencies = []
    traverse(ast, {
        ImportDeclaration: ({ node }) => {
            // 给需要处理的节点加钩子
            dependencies.push(node.source.value)
        }
    })
    
    // es6 -> es5
    
    // presets 是预置插件集合 plugins 是指定插件拼装
    const { code } = await babel.transformFromAstAsync(ast, null, { presets: ["@babel/preset-env"] })

    // 给每一个模块加一个id
    let id = ID++;

    return {
        id,
        filename,
        code,
        dependencies,
    }
}

async function createGraph(entry) {
    const mainAsset = await createAsset(entry)
    const queue = [mainAsset]

    // 遍历每一个asset的每一个denpendency
    for (const asset of queue) {
        const dirname = path.dirname(asset.filename)
        console.log('dirname', dirname)
        for (const relativePath of asset.dependencies) {
            const absolutePath = path.join(dirname, relativePath)
            const child = await createAsset(absolutePath)
            asset['mappings'] = { relativePath: child.id }  // todo 
            // todo 动态添加 for 会随之改变 这个好像和oc不一样
            queue.push(child)
        }
    }

    return queue
}

createGraph(entry).then( graph => {
    console.log(graph)
})

