/*
 * @Author: xizh 
 * @Date: 2021-07-21 22:57:14 
 * @Last Modified by: cooperxie
 * @Last Modified time: 2021-09-26 17:42:12
 */

'use strict'

const path = require('path')
const fs = require('fs')

const chalk = require('chalk')
const figlet = require('figlet')
const ora = require('ora')
const inquirer = require('inquirer')
const downloadRepo = require('download-git-repo')
const shelljs = require('shelljs')

class XizhCli {
    constructor(options){
        this.options = options; // 保存命令行传过来的参数，目前只有projectName，可能之后还有其它逻辑。
        this.config = null; // 用来保存用户选择和输入的项目配置
        this.projectPath = ''; // project 目录
        this.rules = [
            {
                key: 'description',
                required: false,
                defaultValue: 'a Vue.js or React.js Project'
            },
            {
                key: 'author',
                required: false,
            },
            {
                key: 'framework',
                required: true,
                defaultValue: 'vue'
            },
        ]// 校验规则
        this.questions = [
            // {
            //     type: 'input',
            //     name: 'name',
            //     message: '项目名称',
            // },
            {
                type: 'input',
                name: 'description',
                message: '项目描述',
            },
            {
                type: 'input',
                name: 'author',
                message: '作者名',
            },
            {
                type: 'list',
                name: 'framework',
                message: '使用框架',
                choices:['vue', 'react']
            }, 
        ] // 自定义的问题配置
    }
    run(){
        console.log(
            chalk.blue(
                figlet.textSync(`XIZH-CLI`,{
                    // font: "Ghost",
                    horizontalLayout: 'fitted',
                    verticalLayout: 'default',
                })
            )
        )

        // 先校验是否可以新建目录，不然要先选择完再判断
        this.projectPath = path.resolve(__dirname, this.options.name)
        fs.access(this.projectPath, fs.constants.F_OK, (err) => {
            console.log(`${err ? 'does not exist' : 'exists'}`);
            if(err){
                this.init();
            }
        });
    }
    
    init(){
        /**
         *  type：表示提问的类型，包括：input, confirm, list, rawlist, expand, checkbox, password, editor；
            name: 存储当前问题回答的变量；
            message：问题的描述；
            default：默认值；
            choices：列表选项，在某些type下可用，并且包含一个分隔符(separator)；
            validate：对用户的回答进行校验；
            filter：对用户的回答进行过滤处理，返回处理后的值；
            transformer：对用户回答的显示效果进行处理(如：修改回答的字体或背景颜色)，但不会影响最终的答案的内容；
            when：根据前面问题的回答，判断当前问题是否需要被回答；
            pageSize：修改某些type类型下的渲染行数；
            prefix：修改message默认前缀；
            suffix：修改message默认后缀。
         */
        
        inquirer.prompt(this.questions).then(res => {
            res.name = this.options.name
            this.validateConfig(res).then(res => {
                this.config = res;
                this.downloadTemplate().then(flag => {
                    if(flag){
                        this.writeConfig()
                    }
                })
            }).catch(err => {
                console.log('输入参数有误',err)
            })
        }).catch(err => {
            console.log('初始化错误', err)
        })

    }
    // 从git下载模板工程
    downloadTemplate(){
        // 1. download git 仓库
        const spinner = ora('downloading template').start();
        // 用gitee的地址，国内快一点
        const repoMap = {
            vue: 'direct:https://gitee.com/Xzh97/vue-project-template.git',
            react: 'direct:https://gitee.com/Xzh97/react-project-template.git'
        }
        spinner.color = 'blue'
        return new Promise((resolve, reject) => {
            downloadRepo(repoMap[this.config.framework], `${this.projectPath}/`,{clone: true}, err => {
                spinner.stop()
                if(!err){
                    // 把自定义的内容写入模板内
                    console.log(chalk.blue(`downloading template success`))
                    resolve(!err)
                }
                else{
                    console.log(chalk.blue('download template error'))
                    console.log(err)
                    reject(err)
                }
            })
        })
    }
    // 验证前面的输入
    validateConfig(res){
        return new Promise((resolve, reject) => {
            this.rules.forEach(item => {
                let { key, required, defaultValue = '' } = item;
                let val = res[key];
                let configInfo = this.questions.find(item => item.name === key)
                console.log(val)
                if(val){
                    if(key === 'name') {
                        let projectPath = path.resolve(__dirname, this.options.name)
                        
                    }
                }
                else{
                    if(required){
                        let str = configInfo.type === 'input' ? '输入' : '选择'
                        let err = {
                            msg: `请${str}${configInfo.message}`
                        }
                        console.log(err.msg)
                        reject(err)
                    }
                    else{
                        res[key] = defaultValue
                    }
                }
                resolve(res)
            })
        })
    }

    // 把名称，描述，author写入到下载的git工程里的package.json
    writeConfig(){
        try{
            let { description, author } = this.config;
            let packageJsonPath = path.resolve(this.projectPath, './package.json')
            let packageJSON = require(packageJsonPath)
    
            if(packageJSON){
                let projectName = this.projectPath.split('/').pop()
                packageJSON.name = projectName
                packageJSON.description = description
                packageJSON.author = author
            }
    
            let packageJSONStrData = JSON.stringify(packageJSON, undefined, 4)
    
            fs.writeFile(packageJsonPath, packageJSONStrData, (err) => {
                if(err){
                    console.log('fs.writeFile error',err)
                }
                else{
                    console.log('开始安装依赖')
                    this.installDependencies()
                }
            })
        }
        catch(err){
            console.log(err)
            console.log('写入package.json配置出错')
        }
    }

    // 安装node_modules 即执行npm i
    installDependencies(){
        try{
            shelljs.cd(this.projectPath)
            shelljs.exec('npm i', {async: false}, (code, stdout, stderr) => {
                console.log(code)
                console.log(stdout)
                console.log(stderr)
            })
            
        }catch(err){
            console.log('安装依赖出错')
            console.log(err)
        }
    }
}

module.exports = XizhCli