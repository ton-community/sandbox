import {Blockchain} from "./Blockchain";
import {Address, beginCell, Cell, Message, toNano} from "ton-core";
import {randomAddress} from "@ton-community/test-utils";
import {TonClient4} from "ton";
import {RemoteBlockchainStorage} from "./BlockchainStorage";
import {prettyLogTransactions} from "../utils/prettyLogTransaction";
import { createShardAccount } from "./SmartContract";

describe('Blockchain', () => {
    jest.setTimeout(30000)

    it('should work with remote storage', async () => {
        let client = new TonClient4({
            endpoint: 'https://mainnet-v4.tonhubapi.com'
        })

        let blockchain = await Blockchain.create({
            storage: new RemoteBlockchainStorage(client)
        })

        let buyer = randomAddress()

        let saleContractAddress = Address.parse('EQARG1yo4fg29oCxOFM3Ua2rizUErlRw9gu0RWvIfKFtxsF0')

        let message: Message = {
            info: {
                type: 'internal',
                dest: saleContractAddress,
                src: buyer,
                value: { coins: toNano(400) },
                bounce: true,
                ihrDisabled: true,
                bounced: false,
                ihrFee: 0n,
                forwardFee: 0n,
                createdAt: 0,
                createdLt: 0n
            },
            body: beginCell().endCell()
        }

        let res = await blockchain.sendMessage(message)

        prettyLogTransactions(res.transactions)

        let nft = await blockchain.getContract(Address.parse('EQDTbyyOixs9JsO8bmHjk9WJYN8deL-qJeNZvWx147pM8qeO'))
        let data = await nft.get('get_nft_data')

        let [, , , owner] = [data.stackReader.pop(), data.stackReader.pop(), data.stackReader.pop(), data.stackReader.readAddress()]

        expect(buyer.equals(owner)).toBe(true)
    })

    it('should print debug logs', async () => {
        const blockchain = await Blockchain.create()

        const testAddress = randomAddress()

        await blockchain.setShardAccount(testAddress, createShardAccount({
            address: testAddress,
            code: Cell.fromBase64('te6ccgEBBAEAKQABFP8A9KQT9LzyyAsBAgFiAgMAEtBbAf4gMP4gMAAToHw6A/xAYfxAYQ=='),
            data: new Cell(),
            balance: toNano('1'),
        }))

        console.log('transaction')

        await blockchain.sendMessage({
            info: {
                type: 'internal',
                dest: testAddress,
                src: randomAddress(),
                value: { coins: toNano('1') },
                bounce: true,
                ihrDisabled: true,
                bounced: false,
                ihrFee: 0n,
                forwardFee: 0n,
                createdAt: 0,
                createdLt: 0n
            },
            body: beginCell().endCell()
        })

        console.log('get method')

        await blockchain.runGetMethod(testAddress, 'test_dump', [{ type: 'int', value: 3n }, { type: 'int', value: 5n }])
    })

    it('should preinitialize treasury', async () => {
        const blockchain = await Blockchain.create()

        const treasury = await blockchain.treasury('')

        expect((await blockchain.getContract(treasury.address)).accountState?.type).toBe('active')
    })
})