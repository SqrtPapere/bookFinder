var AccessKey = " ";
var SecretAccessKey =  " ";


function invokeRquestbyid(ASIN){

    var unsigned = "http://webservices.amazon.com/onca/xml?" +    //item lookIP with Iframe recensioni by id
        "Service=AWSECommerceService" +
        "&AssociateTag=bookfinder0b420" +
        "&Operation=ItemLookup" +
        "&ItemId="+ASIN +
        "&ResponseGroup=Large" +
        "&TruncateReviewsAt=\"256\"";
    
    return invokeRequest(unsigned);
    
}
function invokeRquestbykeyword(kw){
    
    var unsigned = "http://webservices.amazon.com/onca/" +   //itemsearch by keyword, it returns a list of book
        "xml?Service=AWSECommerceService" +
        "&Operation=ItemSearch" +
        "&AssociateTag=bookfinder0b4-20" +
        "&SearchIndex=Books" +
        "&Keywords="+kw;

    return invokeRequest(unsigned);
}

function invokeRequest(unsignedUrl) {

    if (unsignedUrl == "") {
        alert("Please provide a URL");
        return;
    }

    var lines = unsignedUrl.split("\n");
    unsignedUrl = "";
    for (var i in lines) { unsignedUrl += lines[i]; }

    // find host and query portions
    var urlregex = new RegExp("^http:\\/\\/(.*)\\/onca\\/xml\\?(.*)$");
    var matches = urlregex.exec(unsignedUrl);

    if (matches == null) {
        alert("Could not find PA-API end-point in the URL. Please ensure the URL looks like the example provided.");
        return;
    }

    var host = matches[1].toLowerCase();
    var query = matches[2];

    // split the query into its constituent parts
    var pairs = query.split("&");

    pairs = cleanupRequest(pairs);
    pairs = encodeNameValuePairs(pairs);
    // sort them and put them back together to get the canonical query string
    pairs.sort();
    //document.getElementById("OrderedPairs").value = pairs.join("\n");

    var canonicalQuery = pairs.join("&");
    var stringToSign = "GET\n" + host + "\n/onca/xml\n" + canonicalQuery;

    // calculate the signature
    var secret = SecretAccessKey;
    var signature = sign(secret, stringToSign);

    // assemble the signed url
    var signedUrl = "http://" + host + "/onca/xml?" + canonicalQuery + "&Signature=" + signature;

    // update the UI
   return signedUrl;
}

function encodeNameValuePairs(pairs) {
    for (var i = 0; i < pairs.length; i++) {
        var name = "";
        var value = "";

        var pair = pairs[i];
        var index = pair.indexOf("=");

        // take care of special cases like "&foo&", "&foo=&" and "&=foo&"
        if (index == -1) {
            name = pair;
        } else if (index == 0) {
            value = pair;
        } else {
            name = pair.substring(0, index);
            if (index < pair.length - 1) {
                value = pair.substring(index + 1);
            }
        }

        // decode and encode to make sure we undo any incorrect encoding
        name = encodeURIComponent(decodeURIComponent(name));

        value = value.replace(/\+/g, "%20");
        value = encodeURIComponent(decodeURIComponent(value));

        pairs[i] = name + "=" + value;
    }

    return pairs;
}

function cleanupRequest(pairs) {
    var haveTimestamp = false;
    var haveAwsId = false;
    var accessKeyId =  AccessKey;

    var nPairs = pairs.length;
    var i = 0;
    while (i < nPairs) {
        var p = pairs[i];
        if (p.search(/^Timestamp=/) != -1) {
            haveTimestamp = true;
        } else if (p.search(/^(AWSAccessKeyId|SubscriptionId)=/) != -1) {
            pairs.splice(i, 1, "AWSAccessKeyId=" + accessKeyId);
            haveAwsId = true;
        } else if (p.search(/^Signature=/) != -1) {
            pairs.splice(i, 1);
            i--;
            nPairs--;
        }
        i++;
    }

    if (!haveTimestamp) {
        pairs.push("Timestamp=" + getNowTimeStamp());
    }

    if (!haveAwsId) {
        pairs.push("AWSAccessKeyId=" + accessKeyId);
    }
    return pairs;
}

function sign(secret, message) {
    var messageBytes = str2binb(message);
    var secretBytes = str2binb(secret);

    if (secretBytes.length > 16) {
        secretBytes = core_sha256(secretBytes, secret.length * chrsz);
    }

    var ipad = Array(16), opad = Array(16);
    for (var i = 0; i < 16; i++) {
        ipad[i] = secretBytes[i] ^ 0x36363636;
        opad[i] = secretBytes[i] ^ 0x5C5C5C5C;
    }

    var imsg = ipad.concat(messageBytes);
    var ihash = core_sha256(imsg, 512 + message.length * chrsz);
    var omsg = opad.concat(ihash);
    var ohash = core_sha256(omsg, 512 + 256);

    var b64hash = binb2b64(ohash);
    var urlhash = encodeURIComponent(b64hash);

    return urlhash;
}

Date.prototype.toISODate =
    new Function("with (this)\n    return " +
        "getFullYear()+'-'+addZero(getMonth()+1)+'-'" +
        "+addZero(getDate())+'T'+addZero(getHours())+':'" +
        "+addZero(getMinutes())+':'+addZero(getSeconds())+'.000Z'");

function addZero(n) {
    return ( n < 0 || n > 9 ? "" : "0" ) + n;
}

function getNowTimeStamp() {
    var time = new Date();
    var gmtTime = new Date(time.getTime() + (time.getTimezoneOffset() * 60000));
    return gmtTime.toISODate() ;
}

