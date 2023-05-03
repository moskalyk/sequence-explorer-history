import React from 'react';
import logo from './logo.svg';
import './App.css';
import {ethers} from 'ethers'
import { sequence } from '0xsequence'
import { SequenceIndexerClient } from '@0xsequence/indexer'
// import Modal from 'react-modal';

import { 
  SearchInput,
  RadioGroup,
  GradientAvatar,
  Tabs, 
  Scroll,
  Text, 
  TextInput,
  Button, 
  Box, 
  IconButton, 
  SunIcon, 
  Modal,
  Placeholder,
  Tooltip,
  Tag,
  useTheme } from '@0xsequence/design-system'

const Address = (props: any) => {
  return(
    <>
      <Box justifyContent='center' alignItems='center'>
        <Text variant="medium">→ to </Text><GradientAvatar style={{margin: '10px'}} address={props.address}/> <Text variant="medium">{props.address.slice(0,6)+'...'}</Text>
      </Box>
    </>
  )
}

const Transaction = (props: any) => {
  return(
    <>
      <Box justifyContent='center' alignItems='center'>
        <Text>{props.contractType} {props.tokenId} from </Text><GradientAvatar style={{margin: '10px'}} address={props.from}/><Text>{props.from.slice(0,6)}... → to </Text><GradientAvatar style={{margin: '10px'}} address={props.to}/><Text>{props.to.slice(0,6)}...</Text>
      </Box>
    </>
  )
}

function convertToCSV(objArray: any) {
  var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
  var str = '';

  for (var i = 0; i < array.length; i++) {
      var line = '';
      for (var index in array[i]) {
          if (line != '') line += ','

          line += array[i][index];
      }

      str += line + '\r\n';
  }

  return str;
}

function exportCSVFile(headers: any, items: any, fileTitle: any) {
  if (headers) {
      items.unshift(headers);
  }

  console.log(items)
  // Convert Object to JSON
  var jsonObject = JSON.stringify(items);

  var csv = convertToCSV(jsonObject);

  var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement("a");
  if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilenmae);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
}

const fullIndexerPagination = async (indexer: any, address: string) => {
  const txs: any = []

  const contractAddress = address;

  const filter = {
      accountAddress: contractAddress,
  };

  // query Sequence Indexer for all token transaction history on Mumbai
  let txHistory = await indexer.getTransactionHistory({
      filter: filter,
      page: { pageSize: 10 }
  })

  
  txs.push(...txHistory.transactions)

  // if there are more transactions to log, proceed to paginate
  while(txHistory.page.more){  
      txHistory = await indexer.getTransactionHistory({
          filter: filter,
          page: { 
              pageSize: 10, 
              // use the after cursor from the previous indexer call
              after: txHistory!.page!.after! 
          }
      })
      txs.push(...txHistory.transactions)
  }

  return txs
}

const TransactionHistory = (props: any) => {
  const {theme, setTheme} = useTheme()

  async function getHistory(address: any, network: any) {

    try {
      const txsRes = await fullIndexerPagination(props.indexer, address)

      let txs: any = []

      txsRes.map((tx: any) => {
        console.log(tx)
        tx.transfers.map((transfer: any) => {
          transfer.tokenIds.map((tokenId: any) => {
            console.log(tokenId)
            txs.push({
              transferType: transfer.transferType,
              from: transfer.from,
              to: transfer.to,
              contractType: transfer.contractType,
              tokenId: tokenId
            })
          })
        })
      })
  
      return {success: true, txs: txs}
    }catch(e){
      return {success: false, error: e, txs: []}
    }

  }

  const onChangeInput = async (text: any, network: any) => {
    props.searchType('contract')
    props.setLoading(true)
    props.setQuickView(false)
    props.setSearchQuery(text)

    setTimeout(async () => {
      props.setIsSearching(true)
      props.setFileTitle(text + "")

      const txComponents = []
      const txRaw = []

      const txs = await getHistory(text, network)
      console.log(txs)

      props.setHeaders({
        transferType: "Transfer Type",
        to: "To",
        from: "From",
        contractType: "Contract Type",
        tokenId: "Token Id"
      })

      for (let i = 0; i < txs.txs.length; i++) {
        txComponents.push(<Transaction transferType={txs.txs[i].transferType} to={txs.txs[i].to} from={txs.txs[i].from} contractType={txs.txs[i].contractType} tokenId={txs.txs[i].tokenId}/>)
        txRaw.push({
          transferType: txs.txs[i].transferType,
          to: txs.txs[i].to,
          from: txs.txs[i].from,
          contractType: txs.txs[i].contractType,
          tokenId: txs.txs[i].tokenId
        })
      }
      props.setNFTs(txComponents)
      props.setTransactions(txRaw)
      props.setLoading(false)
    }, 2000)
  }

  return(<>
    <br/>
    <Box justifyContent={'center'}>
      <br/>
      <Tooltip message={'predefined search'}>
        <Tag onClick={() => {props.setNFTs([]);props.setNetwork('polygon');onChangeInput('0x450cB9fbB2D44d166AACA1f6cDb1dBd9Ff168e4C', 'polygon')}}style={{cursor: 'pointer'}} label="0x450c..." gap='10'/>
      </Tooltip>
    </Box>
    <br/>
    <Box justifyContent={'center'} width="full">
      <SearchInput style={{border: 'none', color: theme == 'dark'? 'white' : 'black'}} label="" labelLocation="top" onChange={(evt: any) => onChangeInput(evt.target.value, props.network)}/>
    </Box>
  </>)
}

const Explorer = () => {
  const {theme, setTheme} = useTheme()

  const [isSearching, setIsSearching] = React.useState<any>(false)
  const [loading, setLoading] = React.useState<any>(false)
  const [NFTs, setNFTs] = React.useState<any>([])
  const [transactions, setTransactions] = React.useState<any>()
  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [listName, setListName] = React.useState('');
  const [cidList, setCidList] = React.useState<any>([])
  const [addresses, setAddresses] = React.useState<any>([])
  const [searchQuery, setSearchQuery] = React.useState<any>()
  const [quickView, setQuickView] = React.useState(false)
  const [indexerSignal, setIndexerSignal] = React.useState<any>(null)

  // csv file 
  const [fileTitle, setFileTitle] = React.useState<any>(null)
  const [headers, setHeaders] = React.useState<any>(null)

  // search type
  const [contractSearch, setContractSearch] = React.useState<any>('search-activated')
  const [walletSearch, setWalletSearch] = React.useState<any>(null)

  // networks
  const [network, setNetwork] = React.useState('polygon')

  const searchType = (search: any) => {
    setContractSearch(null)
    setWalletSearch(null)
    if(search == 'contract') setContractSearch('search-activated')
    else setWalletSearch('search-activated')
  }

  React.useEffect(() => {
    if(network == 'mainnet'){
      console.log('connecting to mainnet')
      setIndexerSignal(new SequenceIndexerClient('https://mainnet-indexer.sequence.app'))
      sequence.initWallet('mainnet')
    } else if(network == 'polygon'){
      console.log('connecting to polygon')
      setIndexerSignal(new SequenceIndexerClient('https://polygon-indexer.sequence.app'))
      sequence.initWallet('polygon')
    } else if(network == 'mumbai'){
      console.log('connecting to mumbai')
      setIndexerSignal(new SequenceIndexerClient('https://mumbai-indexer.sequence.app'))
      sequence.initWallet('mumbai')
    }

  }, [network]);

  return (
    <div>
      <br/>
      <Box justifyContent='center'>
        <RadioGroup size='lg' gap='10' flexDirection="row" value={network} onValueChange={(value) => setNetwork(value)}name="network" options={[{'label': "mainnet", value: 'mainnet'},{'label': "polygon", value: 'polygon'},{'label': "mumbai", value: 'mumbai'},]}/>
      </Box>
      <br/>
      <Box>
        <TransactionHistory 
          indexer={indexerSignal} 
          setSearchQuery={setSearchQuery} 
          setNFTs={setNFTs} 
          setQuickView={setQuickView}
          setLoading={setLoading}
          setIsSearching={setIsSearching}
          setFileTitle={setFileTitle}
          setHeaders={setHeaders}
          setTransactions={setTransactions}
          searchType={searchType}
          setNetwork={setNetwork}
        />
      </Box>
      <br/>
      {
        NFTs.length > 0 
        ? <>
            <Text>displaying {NFTs.length}&nbsp;</Text>
            <br/><br/>
            {
              contractSearch == 'search-activated' && !quickView
              ? 
                <>
                  <button onClick={() => exportCSVFile(headers, transactions, fileTitle)} className='export'>export to CSV</button> 
                </>
                : null 
            }
          </>
        : null
      }
      <br/>
      <br/>
      {
        loading ? <Box justifyContent={'center'}><Box flexDirection="column" gap="2"><Placeholder size="md" /><br/><Placeholder size="md" /></Box></Box> : NFTs.length > 0 ?  NFTs : isSearching ? <Text>Nothing to show</Text> : null
      } 
    </div>
  );
};

function App() {

  const {theme, setTheme} = useTheme()

  return (
    <div className="App">
      <Box gap='6'>
        <IconButton style={{position: 'fixed', top: '20px', right: '20px'}} icon={SunIcon} onClick={() => {
          setTheme(theme == 'dark' ? 'light' : 'dark')
        }}/>
      </Box>
      <br/>
      <br/>
      { 
        theme == 'dark' 
        ? 
          <img className="center" src="https://docs.sequence.xyz/img/icons/sequence-composite-dark.svg" />
        :
          <img className='center' src="https://docs.sequence.xyz/img/icons/sequence-composite-light.svg"/> 
      }
      <br/>
      <br/>
      <Text variant="large">explorer</Text>
      <br/>
      <Text variant="small">explore any contract address to view their transaction history</Text>
      <br/>
      <br/>
      <Explorer/>
    </div>
  )
}

export default App;
