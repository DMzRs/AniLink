<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin', fn() => view('admin'));
Route::get('/admin/{any}', fn() => view('admin'))->where('any', '.*');
