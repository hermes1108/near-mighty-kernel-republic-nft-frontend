import React, { useState, useEffect } from 'react';
import * as nearAPI from 'near-api-js'

import './coin.css';
import './Main.scss';

// menu bar
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { Grid } from '@mui/material';
import { styled } from '@mui/material';

//slider
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import PropTypes from 'prop-types';
import Stack from '@mui/material/Stack';

// snack bar
import Snackbar from '@mui/material/Snackbar';
import Slide from '@mui/material/Slide';
import MuiAlert from '@mui/material/Alert';
import BigNumber from "bignumber.js";

import LoadingPad from '../components/LoadingPad'

const { connect, Contract, keyStores, WalletConnection, utils } = nearAPI

const keyStore = new keyStores.BrowserLocalStorageKeyStore();

// const { connect } = nearAPI;

// const nearConfig = {
//     networkId: "mainnet",
//     keyStore,
//     contractName: 'mkr_mint.near',
//     nodeUrl: "https://rpc.mainnet.near.org",
//     walletUrl: "https://wallet.mainnet.near.org",
//     helperUrl: "https://helper.mainnet.near.org",
//     explorerUrl: "https://explorer.mainnet.near.org",
// };

const nearConfig = {
    networkId: "testnet",
    keyStore,
    contractName: 'dev-1655883598135-23071225802774',
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
};

const PRESALE_THRESHOLD = 10, PUBSALE_THRESHOLD = 10;

function TransitionDown(props) {
    return <Slide {...props} direction="down" />;
}

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function ValueLabelComponent(props) {
    const { children, value } = props;

    return (
        <Tooltip enterTouchDelay={0} placement="top" title={value}>
            {children}
        </Tooltip>
    );
}

ValueLabelComponent.propTypes = {
    children: PropTypes.element.isRequired,
    value: PropTypes.number.isRequired,
};

let wallet, near, nftContract, readableContract
const presalePrice = '3880000000000000000000000', pubsalePrice = '5000000000000000000000000'

const Main = () => {
    // snack
    const [snackOpen, setSnackOpen] = useState(false)
    const [transition, setTransition] = React.useState(undefined);
    const vertical = 'top'
    const horizontal = 'center'
    const [alert, setAlert] = useState({ type: '', message: '' })
    // web3 state val
    const [accountId, setAccountId] = useState(localStorage.getItem('account') || '')
    // const [wallet, setWallet] = useState()
    const [connectBtnCaption, setConnectionBtnCaption] = useState('Connect Wallet')
    const [loading, setLoading] = useState(false)

    const [totalSupply, setTotalSupply] = useState(0)
    const [saleState, setSaleState] = useState(0)
    const [whitelisted, setWhitelisted] = useState(false)
    const [presaleMinted, setPresaleMinted] = useState(0)
    const [pubsaleMinted, setPubsaleMinted] = useState(0)

    const initContract = async () => {
        // Initialize connection to the NEAR testnet
        near = await connect(nearConfig)

        const account = new nearAPI.Account(near.connection, nearConfig.contractName);
        readableContract = await new Contract(account, nearConfig.contractName, {
            viewMethods: ['get_total_supply', 'get_curr_price', 'get_sale_state', 'is_whitelist', 'get_metadatas'],
            changeMethods: [],
            sender: nearConfig.contractName
        })
        const metadatas = await readableContract.get_metadatas()
        console.log('metadatas:', metadatas)
        console.log('contract:', readableContract)
        const ttlSupply = await readableContract.get_total_supply()
        console.log('total supply:', ttlSupply)
        setTotalSupply(ttlSupply)
        const slState = await readableContract.get_sale_state()
        console.log("sale state:", slState)
        setSaleState(slState)
        wallet = new WalletConnection(near)

        const accountIdTemp = wallet.getAccountId()
        setAccountId(accountIdTemp)
        localStorage.setItem('account', accountIdTemp)
        console.log('accountId: ', accountIdTemp)
    }

    const onConnectClick = async () => {
        if (connectBtnCaption !== 'Connect Wallet') {
            localStorage.clear()
            setConnectionBtnCaption('Connect Wallet')
            return
        }
        if (wallet?.isSignedIn()) {
            console.log("You are already signed:", wallet.getAccountId())

            setConnectionBtnCaption(`${wallet.getAccountId().substr(0, 6)}...${wallet.getAccountId().substr(wallet.getAccountId().length - 4, 4)}`)

            nftContract = await new Contract(wallet.account(), nearConfig.contractName, {
                viewMethods: ['is_whitelist', 'get_presale_amount', 'get_pubsale_amount'],
                changeMethods: ['nft_mint'],
                sender: wallet.account()
            })
            const wl = await nftContract.is_whitelist({ account_id: wallet.getAccountId() })
            const precnt = await nftContract.get_presale_amount({ account_id: wallet.getAccountId() })
            console.log('precnt:', precnt)
            setPresaleMinted(precnt)
            const pubcnt = await nftContract.get_pubsale_amount({ account_id: wallet.getAccountId() })
            setPubsaleMinted(pubcnt)
            setWhitelisted(wl)
        } else {
            wallet?.requestSignIn(nearConfig.contractName)
        }
    }

    const onSnackClose = () => {
        setSnackOpen(false)
    }

    const mint = async () => {
        if (connectBtnCaption === 'Connect Wallet') {
            setAlert({ type: 'warning', message: `Connect your wallet first` })
            setTransition(() => TransitionDown)
            setSnackOpen(true)
            return
        }
        if (totalSupply >= 777) {
            setAlert({ type: 'warning', message: `Exceeds max nft` })
            setTransition(() => TransitionDown)
            setSnackOpen(true)
            return
        }
        if (saleState === 0) {
            setAlert({ type: 'warning', message: `Sale is not started` })
            setTransition(() => TransitionDown)
            setSnackOpen(true)
            return
        } else if (saleState === 1) {
            if (!whitelisted) {
                setAlert({ type: 'warning', message: `You are not whitelisted member` })
                setTransition(() => TransitionDown)
                setSnackOpen(true)
                return
            }
            if (presaleMinted >= PRESALE_THRESHOLD) {
                setAlert({ type: 'warning', message: `Exceeds max nfts in presale` })
                setTransition(() => TransitionDown)
                setSnackOpen(true)
                return
            }
        } else {
            if (pubsaleMinted >= PUBSALE_THRESHOLD) {
                setAlert({ type: 'warning', message: `Exceeds max nfts in public sale` })
                setTransition(() => TransitionDown)
                setSnackOpen(true)
                return
            }
        }
        const account = await near.account(wallet.getAccountId())
        const blnc = await account.getAccountBalance()
        console.log('balance:', blnc)
        if (BigNumber(blnc.available).lt(BigNumber(whitelisted ? presalePrice : pubsalePrice))) {
            setAlert({ type: 'warning', message: `Insufficient Fund` })
            setTransition(() => TransitionDown)
            setSnackOpen(true)
            return
        }
        const curTokenId = await readableContract.get_total_supply() + 1
        try {
            await nftContract.nft_mint({ token_id: `${curTokenId}`, receiver_id: wallet.getAccountId(), perpetual_royalties: {} },
                "300000000000000", // attached GAS (optional)
                whitelisted ? presalePrice : pubsalePrice)
        } catch (err) {
            console.log('error minting:', err.toString())
        }
    }

    useEffect(async () => {
        const message = localStorage.getItem('notification')
        if (!!message) {
            setAlert({ type: 'success', message: localStorage.getItem('notification') })
            setTransition(() => TransitionDown);
            setSnackOpen(true);
            localStorage.removeItem('notification')
        }
        await initContract()
        const accnt = localStorage.getItem('account')
        if (!!accnt) {
            onConnectClick()
        }
    }, [])

    return (
        <div className='body'>
            {loading && <LoadingPad />}
            <div className='container'>
                <Box
                    sx={{ flexGrow: 1, mt: 5, pb: 5, pt: 5, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                >
                    <Grid
                        container rowSpacing={3} direction='row' justifyContent='center'
                        sx={{ flexWrap: 'wrap-reverse' }}
                    >
                        <Grid item xs={12} sm={5} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
                            <Button onClick={onConnectClick} color='secondary' variant="outlined" sx={{ color: 'white', fontSize: '22px', width: '210px' }}>{connectBtnCaption}</Button>
                            <div style={{ color: 'white', fontFamily: 'Acme', fontWeight: 500, fontSize: '34px' }}>{totalSupply}/777</div>
                            <Button color='secondary' variant="outlined" sx={{ color: 'white', fontSize: '22px' }} onClick={() => mint()}>Mint</Button>
                        </Grid>
                    </Grid>
                </Box>
                <Snackbar
                    open={snackOpen}
                    onClose={onSnackClose}
                    TransitionComponent={transition}
                    key={transition ? transition.name : ''}
                    autoHideDuration={6000}
                    anchorOrigin={{ vertical, horizontal }}
                >
                    <Alert onClose={onSnackClose} severity={alert.type} sx={{ width: '100%' }}>
                        {alert.message}
                    </Alert>
                </Snackbar>
            </div>
        </div >
    )
}

export default Main