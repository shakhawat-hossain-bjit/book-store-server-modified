const { validationResult } = require("express-validator");
const HTTP_STATUS = require("../constants/statusCodes");
const BookModel = require("../model/Book");
const { sendResponse } = require("../utils/common");
const { insertInLog } = require("../server/logFile");
const { default: mongoose } = require("mongoose");

class BookController {
  async getAll(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const {
        sortParam,
        sortOrder,
        search,
        languageSearch,
        category,
        price,
        priceFil,
        stock,
        stockFil,
        rating,
        ratingFil,
        views,
        page = 1,
        limit = 10,
      } = req.query;
      if (page < 1 || limit < 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Page and limit values must be at least 1"
        );
      }
      let sortObj = {};
      if (
        (sortOrder && !sortParam) ||
        (!sortOrder && sortParam) ||
        (sortParam &&
          sortParam !== "pages" &&
          sortParam !== "year" &&
          sortParam !== "title" &&
          sortParam !== "rating" &&
          sortParam !== "reviewCount" &&
          sortParam !== "stock" &&
          sortParam !== "price" &&
          sortParam !== "views") ||
        (sortOrder && sortOrder !== "asc" && sortOrder !== "desc")
      ) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Invalid sort parameters provided"
        );
      }
      //nothing provided about sorting
      else {
        sortObj = { [sortParam || "_id"]: sortOrder === "desc" ? -1 : 1 };
        // console.log(sortObj);
      }
      const filter = {};

      if (price && priceFil) {
        if (priceFil === "low") {
          filter.price = { $lte: parseFloat(price) };
        } else {
          filter.price = { $gte: parseFloat(price) };
        }
      }
      if (stock && stockFil) {
        if (stockFil === "low") {
          filter.stock = { $lte: parseFloat(stock) };
        } else {
          filter.stock = { $gte: parseFloat(stock) };
        }
      }
      if (rating && ratingFil) {
        if (ratingFil === "low") {
          filter.rating = { $lte: parseFloat(rating) };
        } else {
          filter.rating = { $gte: parseFloat(rating) };
        }
      }

      if (category) {
        filter.category = { $in: [category] };
      }
      if (search) {
        filter["$or"] = [
          { author: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
        ];
      }

      console.log("filter ", filter);
      // console.log("sortParam ", sortParam);
      // console.log("sortOrder ", sortOrder);
      const bookCount = await BookModel.find().count();
      const filteredBookCount = await BookModel.find(filter).count();
      const books = await BookModel.find(filter)
        // .sort({
        //   [sortParam]: sortOrder === "asc" ? 1 : -1,
        // })
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit ? limit : 100)
        .populate("discounts", " -books -createdAt -updatedAt  -__v ")
        .select("-createdAt -updatedAt -__v");

      // insertInLog(req);

      const currentTime = new Date();

      //books map
      let discountedBooks = books.map((book) => {
        //discounts map
        let discountSum = book?.discounts?.reduce((total, discount) => {
          if (
            discount?.startTime <= currentTime &&
            currentTime <= discount?.endTime
          ) {
            // console.log("here");
            return total + discount?.discountPercentage;
          }
          return total;
        }, 0);
        // discouunt 100 er besi hole sei product dekhano jabe na
        // console.log(discountSum);
        if (discountSum < 100) {
          book.price = Number(
            (book.price - book.price * (discountSum / 100)).toFixed(2)
          );
          return book;
        }
      });

      if (books.length === 0) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "No Books were found");
      }

      return sendResponse(res, HTTP_STATUS.OK, "Successfully got all books", {
        totalBook: bookCount,
        filteredBookCount: filteredBookCount,
        count: discountedBooks.length,
        page: parseInt(page),
        limit: parseInt(limit),
        books: discountedBooks,
      });
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async getBookById(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const { bookId } = req.params;
      let book = await BookModel.findOne({ _id: bookId })
        .populate("discounts", " -books -createdAt -updatedAt  -__v ")
        .populate("reviews", " -__v ")
        .select("-createdAt -updatedAt -__v");

      if (!book) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Book not Found");
      }

      const currentTime = new Date();

      book = book.toObject();

      let discountSum = book?.discounts?.reduce((total, discount) => {
        if (
          discount?.startTime <= currentTime &&
          currentTime <= discount?.endTime
        ) {
          // console.log("here");
          return total + discount?.discountPercentage;
        }
        return total;
      }, 0);

      if (discountSum >= 100) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Book is not available"
        );
      }

      if (discountSum < 100) {
        book.newPrice = Number(
          (book.price - book.price * (discountSum / 100)).toFixed(2)
        );
      }

      console.log(discountSum, book.newPrice);

      book.discountPercentage = discountSum;

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Successfully got the book",
        book
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async getBookByIdAggregation(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const { bookId } = req.params;
      // let book = await BookModel.findOne({ _id: bookId })
      //   .populate("discounts", " -books -createdAt -updatedAt  -__v ")
      //   .populate("reviews", " -__v ")
      //   .select("-createdAt -updatedAt -__v");
      let book = await BookModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(bookId),
          },
        },
        {
          $lookup: {
            from: "reviews", // Assuming there's a collection called "reviews"
            localField: "reviews",
            foreignField: "_id",
            as: "review_detail", // The field where the review details will be stored
          },
        },
        {
          $unwind: "$review_detail",
        },
        {
          $lookup: {
            from: "users",
            localField: "review_detail.userId",
            foreignField: "_id",
            as: "review_detail.reviewer",
          },
        },
        {
          $addFields: {
            "review_detail.userInfo": {
              $arrayElemAt: ["$review_detail.reviewer", 0],
            },
          },
        },

        {
          $group: {
            _id: "$_id",
            title: { $first: "$title" },
            author: { $first: "$author" },
            price: { $first: "$price" },
            pages: { $first: "$pages" },
            images: { $first: "$images" },
            stock: { $first: "$stock" },
            rating: { $first: "$rating" },
            country: { $first: "$country" },
            review_detail: { $push: "$review_detail" },
            users: { $first: "$user_info" },
          },
        },

        {
          $project: {
            title: 1,
            author: 1,
            price: 1,
            pages: 1,
            images: 1,
            stock: 1,
            rating: 1,
            country: 1,
            "review_detail._id": 1,
            "review_detail.content": 1,
            "review_detail.rating": 1,
            "review_detail.updatedAt": 1,
            "review_detail.userInfo.userName": 1,
            "review_detail.userInfo._id": 1,
          },
        },

        // {
        //   $project: {
        //     title: 1,
        //     author: 1,
        //     "review_detail._id": 1,
        //     "review_detail.content": 1,
        //     "review_detail.rating": 1,
        //     "review_detail.userInfo": 1,
        //   },
        // },
        // {
        //   $unwind: "reveiwer",
        // },

        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "review_detail.userId",
        //     foreignField: "_id",
        //     as: "user_info",
        //   },
        // },
        // {
        //   $project: {
        //     review_detail: 1,
        //     user_info: 1,
        //   },
        // },
        // {
        //   $group: {
        //     _id: "$_id",
        //     // title: "title",
        //     // otherFields: { $first: "$otherFields" }, // Assuming there are other fields that need to be preserved
        //     review_detail: { $push: "$review_detail" }, // Rewinding the unwound reviews array
        //     users: { $first: "$user_info" }, // Preserving the user details
        //   },
        // },
      ]);

      // let book = await BookModel.aggregate([
      //   {
      //     $lookup: {
      //       from: "reviews",
      //       localField: "reviews",
      //       foreignField: "_id",
      //       as: "review_detail",
      //     },
      //   },
      //   {
      //     $unwind: "$review_detail",
      //   },
      //   {
      //     $lookup: {
      //       from: "users",
      //       localField: "review_detail.userId",
      //       foreignField: "_id",
      //       as: "user_info",
      //     },
      //   },
      //   {
      //     $group: {
      //       _id: "$_id",
      //       title: { $first: "$title" }, // Assuming there's a field called "title"
      //       price: { $first: "$price" }, // Assuming there's a field called "title"
      //       author: { $first: "$author" }, // Assuming there's a field called "title"
      //       // otherFields: { $first: "$otherFields" }, // Assuming there are other fields that need to be preserved
      //       review_detail: { $push: "$review_detail" },
      //       users: { $first: "$user_info" },
      //     },
      //   },
      // ]);

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Successfully got the book",
        book
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async create(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const validation = validationResult(req).array();
      if (validation.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the product",
          validation
        );
      }
      const {
        isbn,
        author,
        title,
        country,
        imageLink,
        language,
        link,
        pages,
        year,
        price,
        rating,
        reviewCount,
        category,
        stock,
      } = req.body;

      console.log("book req.file ", req.file);

      const existingProduct = await BookModel.findOne({
        $or: [{ isbn: isbn }, { title: title }],
      });

      // if (existingProduct) {
      //   return sendResponse(
      //     res,
      //     HTTP_STATUS.UNPROCESSABLE_ENTITY,
      //     "Book with same title or isbn already exists"
      //   );
      // }

      const image = [req.file.filename];
      console.log(image);

      const newBook = await BookModel.create({
        author,
        title,
        isbn,
        country,
        imageLink,
        language,
        link,
        pages,
        year,
        price,
        rating,
        reviewCount,
        category,
        stock,
        images: image,
      });
      // console.log(newBook);

      if (newBook) {
        return sendResponse(
          res,
          HTTP_STATUS.CREATED,
          "Successfully added book",
          newBook
        );
      }
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async update(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const validation = validationResult(req).array();
      if (validation.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the product",
          validation
        );
      }

      const { bookId } = req.params;
      const {
        author,
        title,
        country,
        imageLink,
        language,
        link,
        pages,
        year,
        price,
        rating,
        reviewCount,
        category,
        stock,
      } = req.body;

      const existBook = await BookModel.findOne({ _id: bookId });

      if (!existBook) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Book not exist");
      }

      let bookUpdateResult = await BookModel.updateOne(
        { _id: bookId },
        {
          $set: {
            author,
            title,
            country,
            imageLink,
            language,
            link,
            pages,
            year,
            price,
            rating,
            reviewCount,
            category,
            stock,
          },
        }
      );
      console.log(bookUpdateResult);
      if (bookUpdateResult?.modifiedCount) {
        return sendResponse(res, HTTP_STATUS.OK, "Book updated successfully");
      }
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async delete(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params, req.body);
      const validation = validationResult(req).array();
      if (validation.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the product",
          validation
        );
      }

      const { bookId } = req.params;

      let bookDeleted = await BookModel.deleteOne({ _id: bookId });
      // console.log(bookDeleted);

      if (bookDeleted?.deletedCount) {
        return sendResponse(res, HTTP_STATUS.OK, "Book deleted successfully");
      } else {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Book not found");
      }
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }
}

module.exports = new BookController();
