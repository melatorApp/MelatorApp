// --- ¡CONFIGURACIÓN! ---
// 1. Pon tu Clave Publicable de Stripe
const stripe = Stripe("pk_test_51SLXx93MVTFZtvYgumlhmr9Wk3NygUtmkKRwrMrys0Q8bRpmWs5f4nECYjRO6rXtpfEXO04TKMOUTNKTSmSTQ6uk00SJwX9G5G");

// 2. Pon el ID del Precio de tu producto (lo encuentras en el Dashboard de Stripe, empieza con 'price_...')
const PRICE_ID = "price_1SLY1z3MVTFZtvYgDoVmwic8"; 
// -----------------------


const button = document.getElementById("pay-button");
const errorMessage = document.getElementById("error-message");

// 1. Leer el UID del usuario desde la URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid');

if (!userId) {
  button.disabled = true;
  errorMessage.textContent = "Error: No se encontró el ID de usuario. Por favor, regresa a la app de Melator e inténtalo de nuevo.";
}

// 2. Cuando el usuario hace clic en Pagar...
button.addEventListener("click", () => {
  button.disabled = true;
  errorMessage.textContent = "";

  // 3. Redirige al Checkout seguro de Stripe
  stripe.redirectToCheckout({
    lineItems: [{
      price: PRICE_ID,
      quantity: 1,
    }],
    mode: "subscription",
    // 4. ¡CRÍTICO! Pasamos el UID aquí.
    // La Cloud Function leerá este ID para saber a quién activar.
    clientReferenceId: userId,
    
    // 5. URLs de redirección (pueden ser la misma página)
    successUrl: `${window.location.origin}?success=true`,
    cancelUrl: `${window.location.origin}?cancel=true`,
  })
  .then((result) => {
    if (result.error) {
      button.disabled = false;
      errorMessage.textContent = result.error.message;
    }
  });
});

// Mensaje de éxito/cancelación
if (urlParams.has('success')) {
  button.style.display = 'none';
  document.querySelector('h1').textContent = "¡Pago Exitoso!";
  document.querySelector('p').textContent = "Tu suscripción ha sido activada. Por favor, cierra esta ventana y reinicia la app de Melator.";
}
if (urlParams.has('cancel')) {
  document.querySelector('p').textContent = "Pago cancelado. Puedes intentarlo de nuevo cuando quieras.";
}