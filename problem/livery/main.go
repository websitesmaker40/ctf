package main

import (
    "fmt"
    "github.com/golang-jwt/jwt/v5"
    "html/template"
    "log"
    "net/http"
    "os"
    "strconv"
)

type Animal struct {
    Name       string   `json:"name"`
    Type       string   `json:"type"`
    Conditions []string `json:"conditions"`
    Health     float64  `json:"health"`
    Speed      float64  `json:"speed"`
    Stamina    float64  `json:"stamina"`
}

var availableAnimals = []Animal{
    {Name: "Default Ox", Type: "ox", Conditions: []string{},  Health: 1.0, Speed: 5.0, Stamina: 8.0},
    {Name: "Default Mule", Type: "mule", Conditions: []string{}, Health: 1.0, Speed: 6.0, Stamina: 7.0},
    {Name: "Default Horse", Type: "horse", Conditions: []string{}, Health: 1.0, Speed: 8.0, Stamina: 6.0},
    {Name: "Default Donkey", Type: "donkey", Conditions: []string{}, Health: 1.0, Speed: 4.0, Stamina: 9.0},
}

func calculateSellPrice(a Animal) int {
    return int((a.Health * 100) + (a.Speed * 10) + (a.Stamina * 10))
}

func calculateBuyPrice(a Animal) int {
    return int(float64(calculateSellPrice(a)) * 1.2)
}

const htmlTemplate = `
<!DOCTYPE html>
<html>
<body>
    <h2>Your Current Animals</h2>
    {{range $index, $animal := .CurrentAnimals}}
    <div>
        <p>Name: {{$animal.Name}} ({{$animal.Type}}) - Sell for {{sellPrice $animal}} tokens</p>
        <form action="/sell" method="post">
            <input type="hidden" name="index" value="{{$index}}">
            <input type="submit" value="Sell">
        </form>
    </div>
    {{end}}

    <h2>Available Animals</h2>
    {{range $index, $animal := .AvailableAnimals}}
    <div>
        <p>Type: {{$animal.Type}} (Speed: {{$animal.Speed}}, Stamina: {{$animal.Stamina}}) - Buy for {{buyPrice $animal}} tokens</p>
        <form action="/buy" method="post">
            <input type="hidden" name="index" value="{{$index}}">
            <label>Name: <input type="text" name="name" required></label>
            <input type="submit" value="Buy">
        </form>
    </div>
    {{end}}

    <p>Tokens: {{.Tokens}}</p>

    <form action="/done" method="post">
        <input type="submit" value="Done">
    </form>
</body>
</html>`

func validateJWT(tokenString string, secret []byte) (jwt.MapClaims, error) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return secret, nil
    }, jwt.WithAudience("livery"), jwt.WithIssuer("charter-authority"), jwt.WithValidMethods([]string{"HS256"}))

    if err != nil || !token.Valid {
        return nil, fmt.Errorf("invalid token: %v", err)
    }

    return token.Claims.(jwt.MapClaims), nil
}

func isValidAnimal(a Animal) bool {
    if a.Health < 0 || a.Health > 1 {
        return false
    }
    if a.Speed < 0 || a.Speed > 10 {
        return false
    }
    if a.Stamina < 0 || a.Stamina > 10 {
        return false
    }
    validTypes := map[string]bool{"ox": true, "mule": true, "horse": true, "donkey": true}
    if !validTypes[a.Type] {
        return false
    }
    return true
}

func extractAnimals(claims jwt.MapClaims) ([]Animal, error) {
    var animals []Animal
    if animalsData, ok := claims["animals"].([]interface{}); ok {
        for _, animal := range animalsData {
            if animalMap, ok := animal.(map[string]interface{}); ok {
                a := Animal{
                    Name:       animalMap["name"].(string),
                    Type:       animalMap["type"].(string),
                    Health:     animalMap["health"].(float64),
                    Speed:      animalMap["speed"].(float64),
                    Stamina:    animalMap["stamina"].(float64),
                    Conditions: []string{},
                }

                if conditionsData, ok := animalMap["conditions"]; ok && conditionsData != nil {
                    if condArray, ok := conditionsData.([]interface{}); ok {
                        for _, condition := range condArray {
                            if condStr, ok := condition.(string); ok {
                                a.Conditions = append(a.Conditions, condStr)
                            }
                        }
                    }
                }

                if !isValidAnimal(a) {
                    return nil, fmt.Errorf("invalid animal stats: %+v", a)
                }
                animals = append(animals, a)
            } else {
                return nil, fmt.Errorf("invalid animal data: %+v", animal)
            }
        }
    }
    return animals, nil
}

func createSignedToken(claims jwt.MapClaims, secret []byte) (string, error) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}

func updateClaims(w http.ResponseWriter, claims jwt.MapClaims, secret []byte) error {
    tokenString, err := createSignedToken(claims, secret)
    if err != nil {
        return err
    }

    http.SetCookie(w, &http.Cookie{
        Name:  "jwt",
        Value: tokenString,
        Path:  "/",
    })
    return nil
}

type handlerFunc func(http.ResponseWriter, *http.Request) error

func withErrorHandling(fn handlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if err := fn(w, r); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
        }
    }
}

func main() {
    jwtSecret, err := os.ReadFile("/run/secrets/jwt_secret")
    if err != nil {
        log.Fatalf("Error reading JWT secret: %v", err)
    }

    tmpl, err := template.New("livery").Funcs(template.FuncMap{
        "sellPrice": calculateSellPrice,
        "buyPrice":  calculateBuyPrice,
    }).Parse(htmlTemplate)
    if err != nil {
        log.Fatalf("Error parsing template: %v", err)
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        cookie, err := r.Cookie("jwt")
        if err != nil {
            http.Redirect(w, r, "/enter", http.StatusSeeOther)
            return
        }

        claims, err := validateJWT(cookie.Value, jwtSecret)
        if err != nil {
            http.Error(w, "Invalid JWT", http.StatusUnauthorized)
            return
        }

        currentAnimals, err := extractAnimals(claims)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        data := struct {
            CurrentAnimals   []Animal
            AvailableAnimals []Animal
            Tokens           float64
        }{
            CurrentAnimals:   currentAnimals,
            AvailableAnimals: availableAnimals,
            Tokens:           claims["tokens"].(float64),
        }

        w.Header().Set("Content-Type", "text/html")
        tmpl.Execute(w, data)
    })

    http.HandleFunc("/enter", func(w http.ResponseWriter, r *http.Request) {
        jwtParam := r.URL.Query().Get("jwt")
        if jwtParam == "" {
            http.Error(w, "Missing JWT", http.StatusBadRequest)
            return
        }

        _, err := validateJWT(jwtParam, jwtSecret)
        if err != nil {
            http.Error(w, "Invalid JWT", http.StatusUnauthorized)
            return
        }

        cookie := http.Cookie{
            Name:  "jwt",
            Value: jwtParam,
            Path:  "/",
        }
        http.SetCookie(w, &cookie)
        http.Redirect(w, r, "/", http.StatusSeeOther)
    })

    http.HandleFunc("/done", withErrorHandling(func(w http.ResponseWriter, r *http.Request) error {
        if r.Method != http.MethodPost {
            return fmt.Errorf("method not allowed")
        }

        cookie, err := r.Cookie("jwt")
        if err != nil {
            return fmt.Errorf("no JWT cookie")
        }

        claims, err := validateJWT(cookie.Value, jwtSecret)
        if err != nil {
            return err
        }

        claims["iss"] = "livery"
        claims["aud"] = "charter-authority"

        newToken, err := createSignedToken(claims, jwtSecret)
        if err != nil {
            return fmt.Errorf("error creating new token: %v", err)
        }

        domain := os.Getenv("HOST")
        if domain == "" {
            return fmt.Errorf("HOST environment variable not set")
        }

        redirectURL := fmt.Sprintf("http://charterauthority.%s/callback?service=livery&token=%s",
            domain, newToken)
        http.Redirect(w, r, redirectURL, http.StatusSeeOther)
        return nil
    }))

    http.HandleFunc("/sell", withErrorHandling(func(w http.ResponseWriter, r *http.Request) error {
        if r.Method != http.MethodPost {
            return fmt.Errorf("method not allowed")
        }

        cookie, err := r.Cookie("jwt")
        if err != nil {
            return fmt.Errorf("no JWT cookie")
        }

        claims, err := validateJWT(cookie.Value, jwtSecret)
        if err != nil {
            return err
        }

        animals, err := extractAnimals(claims)
        if err != nil {
            return err
        }

        i, err := strconv.Atoi(r.FormValue("index"))
        if err != nil || i < 0 || i >= len(animals) {
            return fmt.Errorf("invalid animal index")
        }

        tokens := claims["tokens"].(float64) + float64(calculateSellPrice(animals[i]))
        newAnimals := append(animals[:i], animals[i+1:]...)

        claims["animals"] = newAnimals
        claims["tokens"] = tokens

        if err := updateClaims(w, claims, jwtSecret); err != nil {
            return err
        }

        http.Redirect(w, r, "/", http.StatusSeeOther)
        return nil
    }))

    http.HandleFunc("/buy", withErrorHandling(func(w http.ResponseWriter, r *http.Request) error {
        if r.Method != http.MethodPost {
            return fmt.Errorf("method not allowed")
        }

        cookie, err := r.Cookie("jwt")
        if err != nil {
            return fmt.Errorf("no JWT cookie")
        }

        claims, err := validateJWT(cookie.Value, jwtSecret)
        if err != nil {
            return err
        }

        i, err := strconv.Atoi(r.FormValue("index"))
        if err != nil || i < 0 || i >= len(availableAnimals) {
            return fmt.Errorf("invalid animal index")
        }

        tokens := claims["tokens"].(float64)
        price := calculateBuyPrice(availableAnimals[i])
        if tokens < float64(price) {
            return fmt.Errorf("insufficient tokens")
        }

        newAnimal := availableAnimals[i]
        newAnimal.Name = r.FormValue("name")

        animals, _ := extractAnimals(claims)
        claims["animals"] = append(animals, newAnimal)
        claims["tokens"] = tokens - float64(price)

        if err := updateClaims(w, claims, jwtSecret); err != nil {
            return err
        }

        http.Redirect(w, r, "/", http.StatusSeeOther)
        return nil
    }))

    log.Fatal(http.ListenAndServe(":80", nil))
}