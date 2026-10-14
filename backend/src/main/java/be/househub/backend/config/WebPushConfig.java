package be.househub.backend.config;

import com.zerodeplibs.webpush.VAPIDKeyPair;
import com.zerodeplibs.webpush.VAPIDKeyPairs;
import com.zerodeplibs.webpush.key.PrivateKeySources;
import com.zerodeplibs.webpush.key.PublicKeySources;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.util.Base64;

/**
 * Builds the single {@link VAPIDKeyPair} used to sign every outgoing Web Push message.
 *
 * <p>The keys are configured (see {@code VAPID_PUBLIC_KEY}/{@code VAPID_PRIVATE_KEY} in
 * {@code docker/.env.example}) in the same raw base64url format the standard `web-push`
 * CLI (`npx web-push generate-vapid-keys`) outputs - not PEM. The public key is already in
 * that library's expected "uncompressed EC point" form, but the private key is a bare
 * 32-byte scalar with no library-provided decoder for that shape, so it's reconstructed
 * here via the standard JCE EC key APIs (P-256 / secp256r1, the curve VAPID always uses)
 * rather than needing an extra PEM-conversion step at deploy time.
 *
 * <p>Also enables {@code @Async} (used by {@link be.househub.backend.service.PushNotificationService}
 * so sending a push never blocks the WebSocket/startup thread that triggered it) - scoped to
 * this config rather than the main application class since nothing else in this app needs it
 * yet.
 */
@Configuration
@EnableAsync
public class WebPushConfig {

    @Bean
    public VAPIDKeyPair vapidKeyPair(
            @Value("${push.vapid.public-key}") String publicKeyBase64Url,
            @Value("${push.vapid.private-key}") String privateKeyBase64Url) throws Exception {

        byte[] publicKeyBytes = Base64.getUrlDecoder().decode(publicKeyBase64Url);
        ECPrivateKey privateKey = toECPrivateKey(Base64.getUrlDecoder().decode(privateKeyBase64Url));

        return VAPIDKeyPairs.of(
                PrivateKeySources.ofECPrivateKey(privateKey),
                PublicKeySources.ofUncompressedBytes(publicKeyBytes));
    }

    private ECPrivateKey toECPrivateKey(byte[] rawScalar) throws Exception {
        AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
        params.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec ecParameterSpec = params.getParameterSpec(ECParameterSpec.class);

        BigInteger s = new BigInteger(1, rawScalar);
        ECPrivateKeySpec privateKeySpec = new ECPrivateKeySpec(s, ecParameterSpec);
        return (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(privateKeySpec);
    }
}
