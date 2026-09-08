<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AniLink — AniManage</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">
    @vite(['resources/css/app.css', 'resources/js/manage.jsx'])
</head>
<body class="bg-[#FAF8F3] text-[#1A1A1A] antialiased font-sans">
    <div id="manage-root" class="font-sans"></div>
</body>
</html>
