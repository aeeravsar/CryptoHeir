const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CryptoHeirModule", (m) => {
  const cryptoHeir = m.contract("CryptoHeir");

  return { cryptoHeir };
});