const cpfInput = document.querySelector("[data-cpf-input]");
const cpfSubmit = document.querySelector("[data-cpf-submit]");
const cpfForm = document.querySelector("[data-cpf-form]");
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
        const variantClass =
          option === "Sim"
            ? " consulta-quick-reply--yes"
            : option === "Não"
              ? " consulta-quick-reply--no"
              : "";
        return `<button type="button" class="consulta-quick-reply${variantClass}" data-quick-reply="${option}">${option}</button>`;
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
    cpfInput.type = "text";
    cpfInput.inputMode = "text";
    cpfInput.autocapitalize = "characters";
    cpfInput.disabled = false;
    cpfSubmit.disabled = false;
    cpfInput.focus();
  };

  const configureForCpf = () => {
    cpfInput.placeholder = "Insira seu CPF...";
    cpfInput.maxLength = 14;
    cpfInput.type = "tel";
    cpfInput.inputMode = "numeric";
    cpfInput.autocapitalize = "off";
    cpfInput.disabled = false;
    cpfSubmit.disabled = false;
  };

  const configureForQuickReply = () => {
    cpfInput.value = "";
    cpfInput.disabled = true;
    cpfSubmit.disabled = true;
  };

  const flowAfterVehicleFound = async () => {
    await sendBotMessageWithTyping(
      `Veículo com a placa <strong>${plateValue}</strong> encontrado com sucesso em nosso sistema.`,
      1500
    );
    await sendBotMessageWithTyping("Deseja solicitar a liberação?", 900);
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
      await sendBotMessageWithTyping("✅ Sucesso!", 900);
      await sendBotMessageWithTyping(
        `⚠️ Atenção: o veículo com placa <strong>${plateValue}</strong> consta com taxa de <strong>ofício de liberação</strong> pendente.`,
        1200
      );
      await sendBotMessageWithTyping(
        "O ofício de liberação do veículo é o documento que indica o pátio e autoriza o proprietário a retirar o veículo.<br>" +
          "<strong>Sem o ofício em mãos, não é possível retirar o veículo do pátio.</strong> O documento é emitido de forma online.",
        1200
      );
      await sendBotMessageWithTyping(
        "Para liberar o veículo, é necessário:<br><br>" +
          "1️⃣ Pagar a guia de liberação de ofício no valor de <strong>R$ 147,83</strong>.<br><br>" +
          "2️⃣ Após o pagamento, o guia de ofício de liberação será enviado para o e-mail informado no momento do pagamento.<br><br>" +
          "3️⃣ Após a emissão, apresentar o ofício de liberação junto com documento de identificação pessoal (CNH, RG ou passaporte) ou procuração legal do proprietário.",
        1300
      );
      await sendBotMessageWithTyping("Deseja realizar a liberação agora?", 900);
      currentStep = "final_decision";
      appendQuickReplies(["Sim", "Não"], async (finalAnswer) => {
        if (finalAnswer === "Sim") {
          const whatsappMessage =
            "Olá, gostaria de realizar o pagamento da guia de liberação " +
            "no valor de R$ 147,83, referente à liberação do meu veículo. Protocolo: 2026841285";
          const whatsappNumber = "5511975948859";
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

        if (rawCpf.length !== 11) {
          await sendBotMessageWithTyping(
            "Informe um CPF válido com 11 dígitos (apenas números).",
            900
          );
          return;
        }

        await sendBotMessageWithTyping("Seja bem-vindo(a) ao nosso atendimento!", 1000);
        await sendBotMessageWithTyping(
          "🟢 Informe a <strong>placa</strong> do veículo (sem espaços e sem traços, em <strong>maiúsculas</strong>).<br><br>Ex.: XJS2890",
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
          `Confirmar a busca para a placa <strong>${plateValue}</strong>?`,
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
          await sendBotMessageWithTyping("Verificando os dados informados…", 1200);
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

  cpfSubmit.addEventListener("click", (event) => {
    event.preventDefault();
    handleSubmit();
  });

  if (cpfForm) {
    cpfForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSubmit();
    });
  }

  configureForCpf();
}
