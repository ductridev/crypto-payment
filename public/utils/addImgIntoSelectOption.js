//test for iterating over child elements
var coinArray = [];
$('.vodiapicker option').each(function () {
    var img = $(this).attr("data-thumbnail");
    var text = this.innerText;
    var value = $(this).val();
    var item = '<li><img src="' + img + '" alt="" value="' + value + '"/><span>' + text + '</span></li>';
    coinArray.push(item);
})

$('#a').html(coinArray);

//Set the button value to the first el of the array
$('.btn-select').html(coinArray[0]);
$('.btn-select').attr('value', 'ETH');

//change button stuff on click
$('#a li').click(function () {
    var img = $(this).find('img').attr("src");
    var value = $(this).find('img').attr('value');
    var text = this.innerText;
    var item = '<li><img src="' + img + '" alt="" /><span>' + text + '</span></li>';
    $('.btn-select').html(item);
    $('.btn-select').attr('value', value);
    $(".b").toggle();
    //console.log(value);
});

$(".btn-select").click(function () {
    $(".b").toggle();
});

//check local storage for the coin
var sessioncoin = localStorage.getItem('coin');
if (sessioncoin) {
    //find an item with value of sessioncoin
    var coinIndex = coinArray.indexOf(sessioncoin);
    $('.btn-select').html(coinArray[coinIndex]);
    $('.btn-select').attr('value', sessioncoin);
} else {
    var coinIndex = coinArray.indexOf('ETH');
    console.log(coinIndex);
    $('.btn-select').html(coinArray[coinIndex]);
}
