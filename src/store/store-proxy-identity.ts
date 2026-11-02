import "server-only";

import {createHmac} from "node:crypto";
import {isIP} from "node:net";

/** Only enable a header that the deployment edge overwrites with one client IP. */
export function storeLookupIdentityHeaders(headers:Headers):Record<string,string>|null{
 const secret=process.env.STORE_BFF_SHARED_SECRET?.trim();
 const header=process.env.STORE_CLIENT_IP_HEADER?.trim().toLowerCase();
 if(!secret&&!header)return {};
 if(!secret||secret.length<32||!header||!/^[-a-z0-9]+$/.test(header))return null;
 const ip=headers.get(header)?.trim();
 if(!ip||!isIP(ip))return null;
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac("sha256",secret).update(`store-guest-lookup:v1\n${timestamp}\n${ip}`).digest("hex");
 return {"X-NFV-Store-Client-IP":ip,"X-NFV-Store-Client-Time":timestamp,"X-NFV-Store-Client-Signature":signature};
}
