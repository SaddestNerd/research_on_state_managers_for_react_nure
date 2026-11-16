const getLocalAccessToken = () => {
  const accessToken = localStorage.getItem("accessToken")
  return accessToken
}

const updateLocalAccessToken = (token) => {
  localStorage.setItem("accessToken", token)
}

const setLocalAccessToken = (token) => {
  localStorage.setItem("accessToken", token)
}

const removeLocalAccessToken = () => {
  localStorage.removeItem("accessToken")
}

export const TokenService = {
  getLocalAccessToken,
  updateLocalAccessToken,
  setLocalAccessToken,
  removeLocalAccessToken,
}
