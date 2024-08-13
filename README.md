# wallet

# changings
1- Use your Own infura key according to your network 

2- Make a account on infura (https://www.infura.io/) and create a key as shown in video (https://www.loom.com/share/679806bf0a3b46fdaa2a73a4ca36a127?sid=0deed9aa-470f-4618-98d4-562eef6a93d9)

3- Paste the link of infura key in the code where mention "paste your infura key "

# Step to run project
1- npm install express prisma @prisma/client ethers@5.7.1

2- npx prisma generate

3- node app.js/appPrisma.js


# Endpoint Details app.js
1- GET Request :  /create-wallet  (to create a new wallet)

2- GET Request :  /get-balance/:address  (to get the balance of ETH,BNB of address)
                  e.g /get-balance/0x1234325245645643

3- POST Request : /transfer-native
                  e.g request body : "privateKey": "", "toAddress": "" , "amount" : ""

4- POST Request : /transfer-token
                  e.g request body : "privateKey": "", "toAddress": "" , "amount" : "" , "tokenAddress" : ""

5- GET Request :  /get-token-balance/:address/:tokenAddress  (to get the balance of any tokenAddress of address)
                  e.g get-token-balance/0x1234325245645643/0xasdfgdsfdsafasfsaasd

                  
# Endpoint Details appPrisma.js 
1- GET Request :  /create-wallet  (to create a new wallet)

2- GET Request :  /get-balance/:address  (to get the balance of ETH,BNB of address)
                  e.g /get-balance/0x1234325245645643

3- POST Request : /transfer-native
                  e.g request body : "privateKey": "", "toAddress": "" , "amount" : ""

4- POST Request : /transfer-token
                  e.g request body : "privateKey": "", "toAddress": "" , "amount" : "" , "tokenAddress" : ""

5- GET Request :  /get-token-balance/:address/:tokenAddress  (to get the balance of any tokenAddress of address)
                  e.g get-token-balance/0x1234325245645643/0xasdfgdsfdsafasfsaasd

6- GET Request : /transactions/:publicAddress (to get transaction history of Address)
                 e.g /transactions/0x1234325245645643

