class MyPromise {
  status = "pending";
  value = null;
  reason = null;
  onFulfilledCallbacks = [];
  onRejectedCallbacks = [];
  constructor(executor) {
    this.status = "pending";
    this.value = null;
    this.reason = null;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    executor(this.resolve.bind(this), this.reject.bind(this));
  }
  resolve(value) {
    if (this.status !== "pending") return;
    this.status = "fulfilled";
    this.value = value;
    queueMicrotask(() => {
      this.onFulfilledCallbacks.forEach((callback) => callback(value));
    });
  }
  reject(reason) {
    if (this.status !== "pending") return;
    this.status = "rejected";
    this.reason = reason;
    queueMicrotask(() => {
      this.onRejectedCallbacks.forEach((callback) => callback(reason));
    });
  }
  then(onFulfilled, onRejected) {
    this.onFulfilledCallbacks.push(onFulfilled);
    this.onRejectedCallbacks.push(onRejected);
  }
}

new MyPromise((resolve, reject) => {
  console.log(1);
  setTimeout(() => {
    resolve("success");
  }, 3000);
  reject("error");
}).then(
  (res) => {
    console.log(res);
  },
  (err) => {
    console.log(err);
  }
);
