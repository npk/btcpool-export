var Button = AMUIReact.Button;
var Input = AMUIReact.Input;
var Panel = AMUIReact.Panel;
var Grid = AMUIReact.Grid;
var AvgGrid = AMUIReact.AvgGrid;
var Col = AMUIReact.Col;
var Article = AMUIReact.Article;
var Alert = AMUIReact.Alert;
var Topbar = AMUIReact.Topbar;
var CollapsibleNav = AMUIReact.CollapsibleNav;
var Nav = AMUIReact.Nav;
var NavItem = AMUIReact.NavItem;
var Selected = AMUIReact.Selected;
var DateTimeInput = AMUIReact.DateTimeInput;
var Progress = AMUIReact.Progress;

function exceptionToString(e) {
    if (typeof(e) == 'string') {
        return e;
    }
    return '未知错误：' + JSON.stringify(e);
}

class DataStore {
    static getAccessKey() {
        var ak = localStorage.getItem("btcpool.accesskey");
        if (typeof(ak) != "string") {
            ak = null;
        }
        return ak;
    }
    
    static setAccessKey(ak) {
        if (typeof(ak) != "string") {
            throw "币看监控密钥必须为字符串";
        }
        
        ak = ak.trim()
        
        if (ak.length == 0) {
            throw "币看监控密钥不能为空";
        }
        if (ak.length < 20) {
            throw "币看监控密钥过短，请确认您已输入完整";
        }
        
        localStorage.setItem("btcpool.accesskey", ak.trim());
    }
    
    static hasAccessKey() {
        return this.getAccessKey() != null;
    }

    static clearAccessKey() {
        localStorage.removeItem("btcpool.accesskey");
    }
}

var HidableAlert = function(props) {
    return props.visible ? (
        <Alert amStyle={props.amStyle}>
            <p>{props.alertText}</p>
        </Alert>
    ) : null;
}

var HidableProgress = function(props) {
    return props.now > 0 ? (
        <Panel header={props.label}>
            <Progress striped amStyle={props.amStyle} now={props.now} />
        </Panel>
    ) : null;
}

function MainNavBar(props) {
    var handleSelectSubAccount = function(props) {
        if (props.active=="SelectSubAccount") {
            return false;
        }
        MainWindow.init();
    }
    var handleSwitchUser = function(props) {
        if (props.active=="SwitchUser") {
            return false;
        }
        MainWindow.switchUser();
    }
    var handleExit = function(props) {
        if (props.active=="Exit") {
            return false;
        }
        MainWindow.exit();
    }

    return (
        <Topbar brand="BTCPool算力导出工具" toggleNavKey="nav">
            <CollapsibleNav eventKey="nav">
            <Nav topbar>
                <NavItem active={props.active=="SwitchUser"} onClick={(props)=>handleSwitchUser(props)} href="#">切换用户</NavItem>
                <NavItem active={props.active=="SelectSubAccount"} onClick={(props)=>handleSelectSubAccount(props)} href="#">选择子账户</NavItem>
                <NavItem active={props.active=="Exit"} onClick={(props)=>handleExit(props)} href="#">退出</NavItem>
            </Nav>
            </CollapsibleNav>
        </Topbar>
    );
}

class InputAccessKey extends React.Component {
    state = {
        accessKey: '',
        hasAlert: false,
        alertText: '',
    }
    
    constructor(props) {
        super(props);
        autoBind(this);
    }
    
    handleAccessKeyChange(e) {
        this.setState({ accessKey: e.target.value });
    }
    
    handleClickNextStep() {
        try {
            MainWindow.saveAccessKey(this.state.accessKey);
        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    render() {
        return (
        <div>
            <MainNavBar active="SwitchUser" />
            <Panel header="请输入您从BTCPool获取的币看监控密钥">
                <HidableAlert amStyle="secondary" visible={this.state.hasAlert} alertText={this.state.alertText} />
                <Grid>
                    <Col sm={12} md={8}><Input type="password" placeholder="币看监控密钥" onChange={this.handleAccessKeyChange} /></Col>
                    <Col sm={12} md={4}><Button onClick={this.handleClickNextStep}>下一步</Button></Col>
                </Grid>
                <p>导出工具需要获得您的授权才能导出您在BTCPool的算力数据，而给予授权最简单的方式就是提供“币看监控密钥”。</p>
                <p>您可以<a href="https://pool.btc.com/dashboard">登录BTCPool</a>，点击右上角的“设置”按钮，然后选择“共享数据”，再点击“获取币看监控密钥”，最后，将其中的“AccessKey”粘贴到上方的输入框即可。</p>
                <p>注意，请<b>妥善保管</b>您的“币看监控密钥”，<b>不要将其提供给任何不信任的人或网站</b>。获得您的“币看监控密钥”相当于获得了您在矿池的登录状态，可以代替您在矿池进行一系列操作，包括但不限于创建子账户、切换币种等。</p>
            </Panel>
        </div>
        );
    }
}

class SelectSubAccount extends React.Component {
    // 根据币种分类的子账户数据
    subAccountData = [];
    // 用于根据puid找到subAccount的索引
    currentSubAccountIndex = {};

    state = {
        coinList: [
            {value:'', label:'加载中...'}
        ],
        subAccountList: [
            {value:'', label:'请先选择币种'}
        ],
        // 选中的币种
        selectedCoinType: '',
        // 选中的子账户（从currentSubAccountIndex中查找）
        selectedSubAccounts: [],
        //开始时间
        beginDate: moment().subtract(7, 'days').format('YYYY-MM-DD'),
        //结束时间
        endDate: moment().format('YYYY-MM-DD'),
        // 警告框数据
        hasAlert: false,
        alertText: '',
        // 进度条数据
        progress: 0,
        progressText: '',
        // 导出为单个表格
        singleTable: true,
    }
    
    constructor(props) {
        super(props);
        autoBind(this);
    }

    async componentDidMount() {
        try {
            this.subAccountData = await PoolAPI.getSubAccounts();
            this.updateCoinList();

        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    updateCoinList() {
        try {
            var newCoinList = [];
            for (var coinType in this.subAccountData) {
                newCoinList.push({value: coinType, label: coinType});
            }
            this.setState({
                coinList: newCoinList
            });

        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    coinTypeChanged(coinType) {
        try {
            this.currentSubAccountIndex = {}
            var newSubAccountList = [
                {value: 'all', label: '全部', sortby: '0'}
            ];

            for (var i in this.subAccountData[coinType]) {
                var account = this.subAccountData[coinType][i];
                this.currentSubAccountIndex[account.puid.toString()] = account;
                newSubAccountList.push({
                    value: account.puid.toString(),
                    label: account.name + ' (' + account.region_name + ')',
                    sortby: account.region_name + '.' + account.name,
                });
            }

            newSubAccountList.sort(function(a, b) {
                return a.sortby.localeCompare(b.sortby);
            });

            this.setState({
                selectedCoinType: coinType,
                subAccountList: newSubAccountList
            });
            
        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    subAccountChanged(selected) {
        try {
            var selectedList = selected.split(',');
            var subAccounts = []

            for (var i in selectedList) {
                var key = selectedList[i]

                if (key == "all") {
                    subAccounts = this.currentSubAccountIndex;
                    break;
                }

                if (this.currentSubAccountIndex[key] != undefined) {
                    subAccounts.push(this.currentSubAccountIndex[key]);
                }
            }

            this.setState({
                selectedSubAccounts: subAccounts
            });
            
        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    beginTimeChanged(selected) {
        this.setState({
            beginDate: selected
        });
    }

    endTimeChanged(selected) {
        this.setState({
            endDate: selected
        });
    }

    singleTableChanged() {
        this.setState({
            singleTable: !this.state.singleTable
        });
    }

    async handleClickExport() {
        try {
            this.setState({
                hasAlert: false,
                alertText: ''
            });

            var coinType = this.state.selectedCoinType;
            var beginDate = this.state.beginDate;
            var endDate = this.state.endDate;
            var accounts = Object.values(this.state.selectedSubAccounts);
            var accountsNum = accounts.length;
            var singleTable = this.state.singleTable;
            var onlyOneTable = accountsNum == 1;

            accounts.sort(function(a, b) {
                return (a.region_name + '.' + a.name).localeCompare(b.region_name + '.' + b.name);
            });

            if (accountsNum < 1) {
                throw "请选择一个要导出的子账户";
            }

            let fileAccountName = onlyOneTable ? (accounts[0].name) : (accountsNum.toString() + '_users');
            if (singleTable) {
                var singleTableContent = ""
                var csvName = coinType + '-' + fileAccountName + '-(' + beginDate + ',' + endDate + ')' + '.csv';
            }
            else {
                var zipName = coinType + '-' + fileAccountName + '-(' + beginDate + ',' + endDate + ')' + '.zip';
                var zip = new JSZip();
            }

            for (let i in accounts) {
                let account = accounts[i];
                let fileName = coinType + '-' + account.name + '-(' + beginDate + ',' + endDate + ')' + '.csv';
                let pos = parseInt(i) + 1;

                let newState = {
                    progress: pos / accountsNum * 100,
                    progressText: '(' + pos + '/' + accountsNum + ') 正在导出子账户 ' + 
                                    account.name + ' (' + account.region_name + ')',
                };
                console.log(newState);
                this.setState(newState);

                let skipHeader = singleTable && i != 0
                let content = await PoolAPI.makeHashrateEarnCSV(account, beginDate, endDate, skipHeader, singleTable);

                if (singleTable) {
                    // 合并到单个文件
                    singleTableContent += content
                }
                else {
                    // 多个文件，加入压缩包
                    let blob = new Blob([content], {type: "text/comma-separated-values;charset=utf-8"});
                    zip.file(fileName, blob);
                }
            }

            if (singleTable) {
                let blob = new Blob([singleTableContent], {type: "text/comma-separated-values;charset=utf-8"});
                saveAs(blob, csvName);
            }
            else {
                let newState = {
                    progress: 100,
                    progressText: '(' + accountsNum + '/' + accountsNum + ') 生成压缩包',
                };
                console.log(newState);
                this.setState(newState);

                let content = await zip.generateAsync({type:"blob"});
                saveAs(content, zipName);
            }

            let newState = {
                    progress: 100,
                    progressText: '(' + accountsNum + '/' + accountsNum + ') 导出完成',
            };
            console.log(newState);
            this.setState(newState);
            
        } catch (e) {
            this.setState({
                hasAlert: true,
                alertText: exceptionToString(e)
            });
        }
    }

    render() {
        var dateProps = {
            showTimePicker: false,
            format: 'YYYY-MM-DD',
        };

        return (
        <div>
            <MainNavBar active="SelectSubAccount" />
            <Panel header="请选择您要导出的币种、子账户及导出的时间段">
                <HidableAlert amStyle="secondary" visible={this.state.hasAlert} alertText={this.state.alertText} />
                <Grid>
                    <Col sm={12} md={6} lg={2}><Selected data={this.state.coinList} placeholder="选择币种" onChange={this.coinTypeChanged} /></Col>
                    <Col sm={12} md={6} lg={2}><Selected data={this.state.subAccountList} placeholder="选择子账户" onChange={this.subAccountChanged} multiple={true} /></Col>
                    <Col sm={12} md={6} lg={2}><DateTimeInput onSelect={this.beginTimeChanged} dateTime={this.state.beginDate} {...dateProps} /></Col>
                    <Col sm={12} md={6} lg={2}><DateTimeInput onSelect={this.endTimeChanged} dateTime={this.state.endDate} {...dateProps} /></Col>
                    <Col sm={12} md={6} lg={2}><Input type="checkbox" label="导出为单个表格" checked={this.state.singleTable} onChange={this.singleTableChanged} inline /></Col>
                    <Col sm={12} md={6} lg={2}><Button onClick={this.handleClickExport}>导出</Button></Col>
                </Grid>
                <HidableProgress now={this.state.progress} label={this.state.progressText} amStyle="success" />
            </Panel>
        </div>
        );
    }
}

class ExitPage extends React.Component {
    render() {
        return (
        <div>
            <MainNavBar active="Exit" />
            <Panel header="退出成功">
                <p>您已退出，您的“币看监控密钥”已从浏览器移除。</p>
                <p>若想再次使用本工具，请点击导航栏上的“切换用户”按钮。</p>
            </Panel>
        </div>
        );
    }
}

class PoolAPI {
    static defaultEndpoint = 'cn-pool.api.btc.com';
    static endpointSuffix = 'pool.api.btc.com';

    static ak() {
        var ak = DataStore.getAccessKey();
        if (ak == null) {
            throw "币看监控密钥为空";
        }
        return ak;
    }

    static get(endpoint, api, params) {
        if (typeof(params) != 'object') {
            params = {};
        }
        params.access_key = PoolAPI.ak();
        return $.get('https://' + endpoint + '/v1/' + api, params);
    }

    static async getSubAccounts() {
        var result = await PoolAPI.get(PoolAPI.defaultEndpoint, 'account/sub-account/morelist');
        if (typeof(result) != 'object') {
            throw "获取子账户列表失败，结果不是对象：" + JSON.stringify(result);
        }
        if (result.err_no != 0) {
            throw "获取子账户列表失败：" + JSON.stringify(result.err_msg);
        }

        var list = {/*
            "BTC": [
                {"puid":1, "name":"aaa", "endpoint":"cn-pool.api.btc.com", "region_name":"cn"},
                {"puid":2, "name":"xxx", "endpoint":"sz-pool.api.btc.com", "region_name":"sz"},
                ...
            ],
            "BCH": [
                {"puid":6, "name":"fff", "endpoint":"us-bccpool.api.btc.com", "region_name":"us"},
                {"puid":9, "name":"xxx_bcc", "endpoint":"sz-bccpool.api.btc.com", "region_name":"sz"},
                ...
            ],
            ...
        */};

        for (var i in result.data.display) {
            var accountData = result.data.display[i];

            // region_name: "cn", endpoint: "cn-pool.api.btc.com"
            // region_name: "cn_ubtc", endpoint: "cn-ubtcpool.api.btc.com"
            var endpoint = accountData.region_name.replace(/_/g, '-');
            if (endpoint.match(/-/) == null) { endpoint += '-'; }
            endpoint += PoolAPI.endpointSuffix;

            var account = {
                puid: accountData.puid,
                name: accountData.name,
                endpoint: endpoint,
                region_name: accountData.country_name,
            };

            if (list[accountData.coin_type] == undefined) {
                list[accountData.coin_type] = [];
            }
            list[accountData.coin_type].push(account);
        }

        return list;
    }

    static async _getHashRate(account, beginTimeStamp, days) {
        var params = {
            puid: account.puid,
            dimension: '1d',
            start_ts: beginTimeStamp,
            count: days,
        };

        var result = await PoolAPI.get(account.endpoint, 'worker/share-history', params);
        if (typeof(result) != 'object') {
            throw "获取算力列表失败，结果不是对象：" + JSON.stringify(result);
        }
        if (result.err_no != 0) {
            throw "获取算力列表失败：" + JSON.stringify(result.err_msg);
        }

        var list = [/*
            { date: '2018-01-01', hashrate: '1.25P', reject_rate: '0.5%' },
            { date: '2018-01-02', hashrate: '2P', reject_rate: '0.3%' },
            ...
        */];

        var unit = result.data.shares_unit;

        for (var i in result.data.tickers) {
            var data = result.data.tickers[i];

            // 当天没有算力就不加入
            if (data[1] == 0 && data[2] == 0) {
                continue;
            }

            list.push({
                date: moment(data[0]*1000).format('YYYY-MM-DD'),
                hashrate: data[1] + unit,
                reject_rate: (data[2] * 100).toString().substr(0, 6) + '%'
            });
        }

        // 该接口会坑爹的返回比预期的多1个元素
        if (list.length > days) {
            while (list.length > days) {
                list.pop();
            }
        }

        return list;
    }

    static async getHashRate(account, beginDate, endDate) {
        const maxPageSize = 720; //最大分页大小

        var beginTimeStamp = new Date(beginDate).getTime() / 1000;
        var endTimeStamp = new Date(endDate).getTime() / 1000;
        var days = (endTimeStamp - beginTimeStamp) / 3600 / 24;

        if (days < 0) {
            var t = endTimeStamp;
            endTimeStamp = beginTimeStamp;
            beginTimeStamp = t;
            days = -days;
        }

        // 起始时间和结束时间为同一天时得到0,所以+1
        days += 1;
        
        if (days < maxPageSize) {
            return this._getHashRate(account, beginTimeStamp, days);
        } else {
            var maxPageTime = maxPageSize * 24 * 3600;
            var fullList = [];

            for (var t=beginTimeStamp; t<=endTimeStamp; t+=maxPageTime) {
                days = (endTimeStamp - t) / 24 / 3600 + 1;
                days = Math.min(maxPageSize, days);

                var result = await this._getHashRate(account, t, days);
                fullList = $.extend(fullList, result);
            }

            return fullList;
        }
    }

    static async _getEarnList(account, page) {
        var params = {
            puid: account.puid,
            page: page,
            reason: 1,
            page_size: 50,
        };

        var result = await PoolAPI.get(account.endpoint, 'account/earn-history', params);

        if (typeof(result) != 'object') {
            throw "获取收益列表失败，结果不是对象：" + JSON.stringify(result);
        }
        if (result.err_no != 0) {
            throw "获取收益列表失败：" + JSON.stringify(result.err_msg);
        }

        return result.data.list;
    }

    static async getEarnList(account, beginDate, endDate) {
        var beginTimeStamp = moment(beginDate).toDate().getTime();
        var endTimeStamp = moment(endDate).toDate().getTime();

        if (endTimeStamp < beginTimeStamp) {
            var t = endTimeStamp;
            endTimeStamp = beginTimeStamp;
            beginTimeStamp = t;
        }

        var fullList = [/*
            { date: '2018-01-01', earn: 38000, paid_amount: 38000, payment_tx: '', address: '', unpaid_reason: 'xxxxx' },
            { date: '2018-01-01', earn: 66666666, paid_amount: 66666666, payment_tx: 'xxxxx', address: 'xxxxx', unpaid_reason: '' },
            ...
        */];

        var minTime = endTimeStamp;
        for (var p=1; minTime >= beginTimeStamp; p++) {

            // 整个partList是按照从最新到最老（时间逆序）排列的
            var partList = await PoolAPI._getEarnList(account, p);
            if (typeof(partList) != 'object' || partList.length == undefined || partList.length < 1) {
                break;
            }

            for (var i in partList) {
                var record = partList[i];
                var time = moment(record.date, 'YYYYMMDD').toDate().getTime();
                
                // 新于结束时间
                if (time > endTimeStamp) {
                    continue;
                }

                if (time < minTime) {
                    minTime = time;
                }
                
                // 老于开始时间
                if (time < beginTimeStamp) {
                    break;
                }

                // 符合时间范围，加入到结果中
                fullList.push({
                    date: moment(record.date, 'YYYYMMDD').format('YYYY-MM-DD'),
                    earn: parseFloat(record.earnings),
                    paid_amount: parseFloat(record.paid_amount),
                    payment_tx: record.payment_tx,
                    address: record.address,
                    unpaid_reason: record.unpaid_reason,
                });
            }
        }

        return fullList;
    }

    static async getHashRateAndEarnList(account, beginDate, endDate) {
        var [hashrateList, earnList] = await Promise.all([
            PoolAPI.getHashRate(account, beginDate, endDate),
            PoolAPI.getEarnList(account, beginDate, endDate)
        ]);

        var mergedList = {/*
            "2018-01-01": {
                hashrate: '1.25P',
                reject_rate: '0.5%',
                earn: 38000,
                paid_amount: 38000,
                payment_tx: '',
                address: '',
                unpaid_reason: 'xxxxx'
            },
            "2018-01-02": {
                hashrate: '2P',
                reject_rate: '0.3%',
                earn: 66666666,
                paid_amount: 66666666,
                payment_tx: 'xxxxx',
                address: 'xxxxx',
                unpaid_reason: ''
            },
            ...
        */};

        // 合并两个结果集

        for (var i in hashrateList) {
            var data = hashrateList[i];
            var key = data.date;

            mergedList[key] = data;
        }

        for (var i in earnList) {
            var data = earnList[i];
            var key = data.date;
            
            if (mergedList[key] == undefined) {
                mergedList[key] = data;
                mergedList[key].paymentNum = 1;
            }
            else if (mergedList[key].paid_amount == undefined) {
                mergedList[key] = $.extend(mergedList[key], data);
                mergedList[key].paymentNum = 1;
            }
            else {
                mergedList[key].paymentNum++;
                mergedList[key].paid_amount += data.paid_amount;
                if (data.payment_tx != "") {
                    mergedList[key].payment_tx    += ' (第' + mergedList[key].paymentNum + '笔)' + data.payment_tx;
                }
                if (data.address != "") {
                    mergedList[key].address       += ' (第' + mergedList[key].paymentNum + '笔)' + data.address;
                }
                if (data.unpaid_reason != "") {
                    mergedList[key].unpaid_reason += ' (第' + mergedList[key].paymentNum + '笔)' + data.unpaid_reason;
                }
            }
        }

        mergedList = Object.values(mergedList);

        mergedList.sort(function(a, b) {
            return a.date.localeCompare(b.date);
        });

        return mergedList;
    }

    static async makeHashrateEarnCSV(account, beginDate, endDate, skipHeader, showAccountName) {
        var list = await PoolAPI.getHashRateAndEarnList(account, beginDate, endDate);

        // 没有BOM会导致某些软件打开CSV乱码
        const unicodeBOM = "\uFEFF";
        const headerFieldAccountName = "子账户名";
        const headerFields = [
            "日期",
            "算力",
            "拒绝率",
            "收益(satoshi)",
            "收益(BTC)",
            "交易哈希",
            "收款地址",
            "备注"
        ];

        var csv = "";
        if (!skipHeader) {
            csv += unicodeBOM;
            if (showAccountName) {
                csv += headerFieldAccountName + ",";
            }
            csv += headerFields.join(',') + "\n";
        }

        for (var i in list) {
            var d = list[i];

            if (typeof(d.unpaid_reason) == 'string') {
                // 去除逗号和引号
                d.unpaid_reason = d.unpaid_reason.replace(/[,"]/g, ' ');
            }

            var fields = [
                d.date,
                d.hashrate,
                d.reject_rate,
                d.paid_amount,
                d.paid_amount / 100000000,
                d.payment_tx,
                d.address,
                d.unpaid_reason,
            ];

            if (showAccountName) {
                csv += account.name + ",";
            }
            csv += fields.join(',') + "\n";
        }

        return csv;
    }
}

class MainWindow {
    static show(content) {
        ReactDOM.render(content,document.getElementById('MainWindow'));
    }

    static init() {
        if (DataStore.hasAccessKey()) {
            MainWindow.show(<SelectSubAccount />);
        } else {
            MainWindow.show(<InputAccessKey />);
        }
    }

    static saveAccessKey(ak) {
        DataStore.setAccessKey(ak);
        MainWindow.show(<SelectSubAccount />);
    }

    static switchUser() {
        MainWindow.show(<InputAccessKey />);
    }

    static exit() {
        DataStore.clearAccessKey();
        MainWindow.show(<ExitPage />);
    }
}
