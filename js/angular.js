/**
 * Created by Administrator on 2017/4/13.
 */
var app = angular.module("kaifanla",["ionic"]);

//防抖动处理
app.factory('$debounce', ['$rootScope', '$browser', '$q', '$exceptionHandler',
        function($rootScope, $browser, $q, $exceptionHandler) {
            var deferreds = {},
                methods = {},
                uuid = 0;

            function debounce(fn, delay, invokeApply) {
                var deferred = $q.defer(),
                    promise = deferred.promise,
                    skipApply = (angular.isDefined(invokeApply) && !invokeApply),
                    timeoutId, cleanup,
                    methodId, bouncing = false;

                // check we dont have this method already registered
                angular.forEach(methods, function(value, key) {
                    if (angular.equals(methods[key].fn, fn)) {
                        bouncing = true;
                        methodId = key;
                    }
                });

                // not bouncing, then register new instance
                if (!bouncing) {
                    methodId = uuid++;
                    methods[methodId] = { fn: fn };
                } else {
                    // clear the old timeout
                    deferreds[methods[methodId].timeoutId].reject('bounced');
                    $browser.defer.cancel(methods[methodId].timeoutId);
                }

                var debounced = function() {
                    // actually executing? clean method bank
                    delete methods[methodId];

                    try {
                        deferred.resolve(fn());
                    } catch (e) {
                        deferred.reject(e);
                        $exceptionHandler(e);
                    }

                    if (!skipApply) $rootScope.$apply();
                };

                timeoutId = $browser.defer(debounced, delay);

                // track id with method
                methods[methodId].timeoutId = timeoutId;

                cleanup = function(reason) {
                    delete deferreds[promise.$$timeoutId];
                };

                promise.$$timeoutId = timeoutId;
                deferreds[timeoutId] = deferred;
                promise.then(cleanup, cleanup);

                return promise;
            }


            // similar to angular's $timeout cancel
            debounce.cancel = function(promise) {
                if (promise && promise.$$timeoutId in deferreds) {
                    deferreds[promise.$$timeoutId].reject('canceled');
                    return $browser.defer.cancel(promise.$$timeoutId);
                }
                return false;
            };

            return debounce;
        }
    ]);//防抖动处理



app.config(function ($stateProvider,$urlRouterProvider) {
    $stateProvider
      .state('start',{
        url:'/kflstart',
        templateUrl:'tpl/start.html'
    }).state("main",{
        url:"/kflmain",
        templateUrl:"tpl/main.html",
        controller:"mainCtrl"
    }).state("detail",{
        url:"/kfldetail/:id",
        templateUrl:"tpl/detail.html",
        controller:"detailCtrl"
    }).state("myorder",{
        url:"/kflmyorder",
        templateUrl:"tpl/myorder.html",
        controller:"myorderCtrl"
    }).state("setting",{
        url:"/kflsetting",
        templateUrl:"tpl/settings.html",
        controller:"settingCtrl"
    }).state("cart",{
        url:"/kflcart",
        templateUrl:"tpl/cart.html",
        controller:"cartCtrl"
    }).state("register",{
        url:"/kflregister",
        templateUrl:"tpl/register.html",
        controller:"registerCtrl"
    }).state("success",{
            url:"/kflsuccess/:oid",
            templateUrl:"tpl/include/success.html",
            controller:"successCtrl"
        });
    $urlRouterProvider.otherwise('/kflstart');

});
//如果发起post请求，设置请求头信息：
app.run(function ($http) {
    $http.defaults.headers.post ={'Content-Type':'application/x-www-form-urlencoded'};
});

app.controller("mainCtrl",["$scope","$http","$debounce","$ionicLoading","$timeout", function ($scope,$http,$debounce,$ionicLoading,$timeout) {
    $scope.hasMore = true;
    $scope.shwo = false;
    $http.get("data/dish_getbypage.php?start="+0).success(function (data) {
        $scope.list = data;
        console.log($scope.list);
    });
    $scope.parent = {search:""};
    $scope.$watch("parent.search",function () {
        $debounce(watchSearch,300);
    });
    watchSearch = function () {
        console.log("搜索打印："+$scope.parent.search);
        if ($scope.parent.search){
            $http({
                method: 'post',
                url: 'data/dish_getbykw.php?search='+$scope.parent.search
            }).success(function (data) {
                // 请求成功执行代码
                $scope.list =data;
                if ($scope.list.length < 1){
                    $scope.shwo = true;
                }else if ($scope.list.length > 0){
                    $scope.shwo = false;
                }else if($scope.list.code==-1){
                    console.log($scope.list.msg);
                }
                console.log($scope.list);
            })
        }else{
        	$http.get("data/dish_getbypage.php?start="+0).success(function (data) {
        	$scope.list = data;
    })
        }
    };

    $scope.btn = function () {
        $http.get("data/dish_getbypage.php?start="+$scope.list.length).success(function (data) {
            if (data.length < 5) {
                $scope.hasMore = false;
            }
//          $interval(function(){
//          	$ionicLoading.show({
//          	template:"Loading..."
//          })
//          },1000);
            
            $scope.list = $scope.list.concat(data);
            $scope.shwo = false;
            console.log($scope.list);
        });
  }
    
    $scope.loadMore = function () {
    
    $http.get("data/dish_getbypage.php?start="+$scope.list.length).success(function (data) {
            if (data.length < 5) {
                $scope.hasMore = false;
            }
            
            $scope.list = $scope.list.concat(data);
            $scope.$broadcast("scroll.infiniteScrollComplete");
            $scope.shwo = false;
            console.log($scope.list);
       });
    
    
            
        }
    
}]);

app.controller("detailCtrl",["$scope","$stateParams","$http","$ionicPopup", function ($scope,$stateParams,$http,$ionicPopup) {
    var userid = sessionStorage["userid"];
    console.log("获取商品id："+$stateParams.id);
    $http.get("data/dish_getbyid.php?id="+$stateParams.id).success(function (data) {
        console.log(data[0]);
        $scope.list = data[0];
    });
    $scope.add_order = function(){
        console.log(userid);
        if (userid===undefined){
            $state.go("register");
        }
        var result ="did="+$scope.list.did+"&uid="+userid+"&count=-1";
        console.log(result);
        $http.post("data/cart_update.php",result).success(function(data){
            console.log(data);
            //当添加到购物车成功时，总数肯定是自增
            $scope.data.totalNumInCart++;
            $ionicPopup.alert({
                title: '购物车弹出框',
                template: "确认添加成功"
            });
        })
    }
}]);

app.controller("myorderCtrl",["$scope","$http","$state", function ($scope,$http,$state) {
    var userid = sessionStorage["userid"];
    if (userid===undefined){
        console.log(userid);

        $state.go("register");
    }else {
        $http.get("data/order_getbyuserid.php?userid="+userid).success(function (response) {
            console.log(response);
            $scope.list = response.data;
            if ($scope.list.length<1){
                $scope.res = "无订单去主页购买";
            }
        })
    }
}]);


app.controller("cartCtrl",["$scope","$http","$ionicModal","$httpParamSerializerJQLike","$ionicLoading","$state",function ($scope,$http,$ionicModal,$httpParamSerializerJQLike,$ionicLoading,$state) {
    var userid = sessionStorage["userid"];

    $http.get("data/cart_select.php?uid="+userid).success(function (response) {
        $scope.list = response.data;
        updateTotaNum = function (){
            //在进入购物车页面时，将服务器返回的所有的数据的数量累加，
            // 赋值给totalNumInCart
            $scope.data.totalNumInCart = 0;
            angular.forEach($scope.list,
                function (value,key) {
                    $scope.data.totalNumInCart+=parseInt(value.dishCount);
                });
        };
        console.log($scope.list);
        updateTotaNum();


        if ($scope.list.length < 1){
            $scope.cart_ts = "购物车无商品！";
        }
        $scope.sumAll = function() {
            var totalprice = 0;
            angular.forEach($scope.list,function(value, key) {
                    totalprice += (value.price * value.dishCount);
                })
            return totalprice;
        };
        var totalprice = 0;
        angular.forEach(
            angular.fromJson($scope.list),
            function(value, key) {
                totalprice += (value.price * value.dishCount);
            }
        );
        var result = angular.toJson($scope.list);
        $scope.order = {
            cartDetail:result,
            totalprice:totalprice,
            userid:userid
        };
        $scope.Submit_btn = function(){
                var result2 = $httpParamSerializerJQLike($scope.order);
                $http.post("data/order_add.php",result2).success(function(data){
                    console.log(data);
                    $scope.modal.hide();
                    updateTotaNum();




                    $state.go("myorder");
                });
        };
        $scope.delete_btn = function (index,item) {
            console.log(index,item);
            updateTotaNum();





            $http.post("data/cart_update.php?uid="+userid+"&count=-2"+"&did="+$scope.list[index].did).success(function (data) {
                console.log(data);
                $ionicLoading.show({
                    template:'成功删除...',
                    duration:500//多少毫秒
                });
                $scope.list.splice(index,1);
            });
        };
        $scope.add_btn = function (index) {
            console.log(index);
            $scope.list[index].dishCount++;
            $http.post(
                "data/cart_update.php?uid="+userid+"&count="+$scope.list[index].dishCount+"&did="+$scope.list[index].did
            ).success(function (data) {
                console.log(data);
                    updateTotaNum();
            })
        };
        $scope.minus = function (index) {
            console.log(index);
            $scope.list[index].dishCount--;
            if ($scope.list[index].dishCount == 0){
                $scope.list[index].dishCount = 1;
            }else {
                $http.post(
                    "data/cart_update.php?uid="+userid+"&count="+$scope.list[index].dishCount+"&did="+$scope.list[index].did
                ).success(function (data) {
                    console.log(data);
                        updateTotaNum();
                })
            }

        };
        //配置弹窗
        $ionicModal
            .fromTemplateUrl('cart_btn.html',{
                scope:$scope
            })
            .then(function (modal) {
                $scope.modal = modal;
            });
        //打开一个自定义的弹窗
        $scope.open = function () {
            if ($scope.list.length < 1){
                $ionicLoading.show({
                    template:'购物车无商品！',
                    duration:1000//多少毫秒
                });
            }else {
                $scope.modal.show();
            }
        }
        //关闭一个自定义的弹窗
        $scope.close = function () {
            $scope.modal.hide();
        }
    })
}]);


app.controller("settingCtrl",["$scope","$http","$ionicModal","$state",function ($scope,$http,$ionicModal,$state) {
        var userid = sessionStorage["userid"];
        if (userid===undefined){
        $state.go("register");
        }
        $http.get("data/About.php?userid="+userid).success(function (data) {
            console.log(data);
            $scope.list = data;
        });
        //配置弹窗
        $ionicModal.fromTemplateUrl('useropen.html',{
                scope:$scope
            })
            .then(function (modal) {
                $scope.modal2 = modal;
            });
        //打开一个自定义的弹窗
        $scope.useropen = function () {
            $scope.modal2.show();
        };
        //关闭一个自定义的弹窗
        $scope.close2 = function () {
            $scope.modal2.hide();
        };

        //配置弹窗
        $ionicModal
            .fromTemplateUrl('About.html',{
                scope:$scope
            })
            .then(function (modal) {
                $scope.modal = modal;
            });
        //打开一个自定义的弹窗
        $scope.open = function () {
                $scope.modal.show();
        };
        //关闭一个自定义的弹窗
        $scope.close = function () {
            $scope.modal.hide();
        };
    $scope.closeout = function (){
        sessionStorage.removeItem("userid");
        $state.go("start");
    }
}]);

app.controller("registerCtrl",["$scope","$http","$httpParamSerializerJQLike","$ionicLoading","$timeout","$state",function($scope,$http,$httpParamSerializerJQLike,$ionicLoading,$timeout,$state){
    $ionicLoading.show({
        template: '请注册用户...',
        duration:1000
    });
    $scope.data = {};
    $scope.register_btn = function () {
        var result = $httpParamSerializerJQLike($scope.data);
        console.log(result);
        $http.post("data/register.php",result).success(function (reponse) {
            console.log(reponse);
            sessionStorage.setItem("userid",reponse);
            $ionicLoading.show({
                template: '注册成功并登陆...',
                duration:1000
            });
            $timeout(function (){
               $state.go("myorder");
            },1000);

        })
    }
}]);

app.controller("successCtrl",["$scope","$stateParams", function ($scope,$stateParams) {
    console.log("获取商品id："+$stateParams.oid);
    $scope.list = $stateParams.oid;
}]);


app.controller("parentCtrl",["$scope","$state",function ($scope ,$state) {
    $scope.data = {totalNumInCart:0};
    $scope.jump = function (desState,argument) {
        console.log(desState,argument);
        $state.go(desState);
    };
}]);



