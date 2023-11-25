const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res){
    res.json({data: orders});
}

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName]) {
            return next();
        }
        next({ status: 400, message: `Must include a ${propertyName}` });
    };
}

function dishesIsValid(req, res, next){
    const { data: { dishes } = {} } = req.body;
    if(!Array.isArray(dishes) || !dishes.length){
        next({status: 400, message: "Order must include at least one dish"})
    }
    const validQuantity = dishes.every((dish) => {
        return (Number.isInteger(dish.quantity) && dish.quantity > 0);
    });
    if(validQuantity){
        return next();
    }
    const index = dishes.findIndex((dish) => {
        return (!Number.isInteger(dish.quantity) || dish.quantity < 1);
    });
    next({status: 400, message: `Dish ${index} must have a quantity that is an integer greater than 0`})
}

function statusIsValid(req, res, next){
    const {data: {status} = {} } = req.body;
    if(status){
        switch(status){
            case "pending":
            case "preparing":
            case "out-for-delivery":
            case "delivered": {
                return next();
            }
            default: {
                next({status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered"})
            }       
        }
    }
    next({status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered"})
}   


function create(req, res, next){
    const {data: {deliverTo, mobileNumber, dishes} = {} } = req.body;

    const newOrder = {
        id: nextId(),
        deliverTo,
        mobileNumber,
        dishes,
    };

    orders.push(newOrder);
    res.status(201).json({data: newOrder});
}

function orderExists(req, res, next){
    const {orderId} = req.params;
    const foundOrder = orders.find((order) => order.id == orderId);
    if(foundOrder){
        res.locals.order = foundOrder;
        return next();
    }
    next({status: 404, message: `Order does not exist: ${orderId}`});
}

function read(req, res){
    res.json({data: res.locals.order});
}

function update(req, res, next){
    const order = res.locals.order;
    const {orderId} = req.params;

    if(order.status === "delivered"){
        next({status: 400, message: "A delivered order cannot be changed"});
    }
  
    
    const {data: {deliverTo, mobileNumber, dishes, id} = {} } = req.body;

    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.dishes = dishes;
    
    if(id != orderId && id){
        next({status: 400, message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`});
    }
  
    res.json({ data: order });
}

function destroy(req, res, next){
    if(res.locals.order.status !== "pending"){
        next({status: 400, message: "An order cannot be deleted unless it is pending. Returns a 400 status code"});
    }
    const index = orders.findIndex((order) => order.id === res.locals.order.id);
    orders.splice(index, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    create: [
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        dishesIsValid,
        create,
    ],
    read: [orderExists, read],
    update: [
        orderExists,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        dishesIsValid,
        statusIsValid,
        update,
    ],
    destroy: [orderExists, destroy]
}