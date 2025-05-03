const {
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const User = require("../models/user");
const Vendor = require("../models/vendor");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "AKIAUC22JWI7DVXKF66V",
    secretAccessKey: "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",
  },
});

// async function getObject(key) {
//   const command = new GetObjectCommand({
//     Bucket: "aapkakaam",
//     Key: key,
//   });

//   const url = await getSignedUrl(s3Client, command);
//   return url;
// }

async function putObject(fileName, contentType, category) {
  const command = new PutObjectCommand({
    Bucket: "aapkakaam",
    Key: `uploads/${category}/${fileName}`,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
  return url;
}

exports.uploads = async (req, res, next) => {
  const category = req.params.category;
  const id = req.params.id;

  const url = await putObject(`img${id}.jpeg`, "image/jpeg", category);

  res.status(200).json({ urlForUploads: url });
};

exports.getUploads = async (req, res, next) => {
  const category = req.params.category;
  const id = req.params.id;

  const url = `https://aapkakaam.s3.ap-south-1.amazonaws.com/uploads/${category}/img${id}.jpeg`;

  if (category == "user") {
    User.findByIdAndUpdate(id, { imgURL: url }, { new: true }).then((resu) => {
      res.status(200).json({ message: "Done..", imgURL: url });
    });
  } else if (category == "vendor") {
    Vendor.findByIdAndUpdate(id, { imgURL: url }, { new: true }).then(
      (resu) => {
        res.status(200).json({ message: "Done..", imgURL: url });
      }
    );
  }
};
